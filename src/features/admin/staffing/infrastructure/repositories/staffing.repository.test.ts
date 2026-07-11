/**
 * Integration tests — StaffingRepository (US-E06.8 + US-E18.2 contract remap).
 * The http interceptor unwraps the envelope; repositories receive the payload
 * directly (or the raw envelope for `{ raw: true }` list calls) and a normalised
 * ApiError on failure. Covers: the full `Staffing` error-code matrix (branch on
 * code), the `activeAssignmentCount`/`positionTitleName` derivations, the
 * `memberName` fallback, the `scopeEntityType` derivation on create, and the
 * `ARCHIVED → REVOKED` status remap.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError, unwrapResponse } from "@/bootstrap/lib/api-envelope";
import type { StaffingFailure } from "../../domain/failures/staffing.failure";
import type { DepartmentResponseDto } from "../dtos/department-response.dto";
import type { PositionAssignmentResponseDto } from "../dtos/position-assignment-response.dto";
import type { PositionTitleResponseDto } from "../dtos/position-title-response.dto";
import { StaffingRepository } from "./staffing.repository";

const EP = {
  departments: "/core/api/v1/departments",
  positionTitles: "/core/api/v1/position-titles",
  positionAssignments: "/core/api/v1/position-assignments",
};

function apiError(code: string, status: number, retryable = false) {
  return new ApiError({ code, message: code, retryable, status });
}

function envelope<T>(
  items: T[],
  pagination: { nextCursor: string | null; hasMore: boolean } = {
    nextCursor: null,
    hasMore: false,
  },
) {
  return {
    success: true,
    data: items,
    error: null,
    meta: { requestId: "req-test", pagination },
  };
}

function depDto(
  over: Partial<DepartmentResponseDto> = {},
): DepartmentResponseDto {
  return {
    departmentId: "dep-1",
    tenantId: "t-1",
    name: "Tổ Toán",
    conceptLabelSuggested: "TO",
    conceptLabelCustom: null,
    subjectParentIds: [],
    status: "ACTIVE",
    createdAt: "2025-08-01T00:00:00.000Z",
    updatedAt: "2025-08-01T00:00:00.000Z",
    ...over,
  };
}

function titleDto(
  over: Partial<PositionTitleResponseDto> = {},
): PositionTitleResponseDto {
  return {
    positionTitleId: "pt-1",
    tenantId: "t-1",
    name: "Tổ trưởng",
    scopeType: "SUBJECT_PARENT",
    permissions: ["MANAGE_SUBJECT_CONTENT"],
    status: "ACTIVE",
    createdAt: "2025-08-01T00:00:00.000Z",
    updatedAt: "2025-08-01T00:00:00.000Z",
    ...over,
  };
}

function asgDto(
  over: Partial<PositionAssignmentResponseDto> = {},
): PositionAssignmentResponseDto {
  return {
    positionAssignmentId: "pa-1",
    tenantId: "t-1",
    positionTitleId: "pt-1",
    memberId: "m-101",
    scopeEntityType: "SUBJECT_PARENT",
    scopeEntityId: "sp-math",
    academicYearId: "ay-2025",
    status: "ACTIVE",
    createdAt: "2025-08-15T00:00:00.000Z",
    updatedAt: "2025-08-15T00:00:00.000Z",
    ...over,
  };
}

/** A `get` mock that routes by URL (list calls → envelope, single get → payload). */
function routedGet(
  routes: Partial<Record<keyof typeof EP, unknown>> & {
    single?: (url: string) => unknown;
  },
) {
  return vi.fn(async (url: string, _config?: { params?: unknown }) => {
    void _config;
    if (url === EP.departments) return routes.departments;
    if (url === EP.positionTitles) return routes.positionTitles;
    if (url === EP.positionAssignments) return routes.positionAssignments;
    if (routes.single) return routes.single(url);
    throw new Error(`unrouted get ${url}`);
  });
}

function makeHttp(over: Record<string, unknown> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

describe("StaffingRepository — activeAssignmentCount derivation", () => {
  it("counts ACTIVE assignments by scopeEntityId for departments", async () => {
    const http = makeHttp({
      get: routedGet({
        departments: envelope([
          depDto({ departmentId: "dep-1" }),
          depDto({ departmentId: "dep-2" }),
        ]),
        positionAssignments: envelope([
          asgDto({ scopeEntityId: "dep-1", scopeEntityType: "DEPARTMENT" }),
          asgDto({ scopeEntityId: "dep-1", scopeEntityType: "DEPARTMENT" }),
          asgDto({ scopeEntityId: "sp-math" }),
        ]),
      }),
    });
    const repo = new StaffingRepository(http);
    const res = await repo.listDepartments();
    expect(res.ok).toBe(true);
    if (res.ok) {
      const byId = new Map(
        res.value.map((d) => [d.id, d.activeAssignmentCount]),
      );
      expect(byId.get("dep-1")).toBe(2);
      expect(byId.get("dep-2")).toBe(0);
    }
  });

  it("counts ACTIVE assignments by positionTitleId for titles", async () => {
    const http = makeHttp({
      get: routedGet({
        positionTitles: envelope([
          titleDto({ positionTitleId: "pt-1" }),
          titleDto({ positionTitleId: "pt-2" }),
        ]),
        positionAssignments: envelope([
          asgDto({ positionTitleId: "pt-1" }),
          asgDto({ positionTitleId: "pt-1" }),
          asgDto({ positionTitleId: "pt-1" }),
        ]),
      }),
    });
    const repo = new StaffingRepository(http);
    const res = await repo.listPositionTitles();
    expect(res.ok).toBe(true);
    if (res.ok) {
      const byId = new Map(
        res.value.map((t) => [t.id, t.activeAssignmentCount]),
      );
      expect(byId.get("pt-1")).toBe(3);
      expect(byId.get("pt-2")).toBe(0);
    }
  });

  it("fully paginates the active-assignments fetch (cursor loop)", async () => {
    // page 1 → hasMore, page 2 → done. Both scoped to dep-1.
    const get = vi.fn(async (url: string, config?: { params?: unknown }) => {
      if (url === EP.departments)
        return envelope([depDto({ departmentId: "dep-1" })]);
      if (url === EP.positionAssignments) {
        const cursor = (config?.params as { cursor?: string })?.cursor;
        if (!cursor) {
          return envelope(
            [asgDto({ scopeEntityId: "dep-1", scopeEntityType: "DEPARTMENT" })],
            { nextCursor: "c2", hasMore: true },
          );
        }
        return envelope([
          asgDto({ scopeEntityId: "dep-1", scopeEntityType: "DEPARTMENT" }),
        ]);
      }
      throw new Error(`unrouted ${url}`);
    });
    const repo = new StaffingRepository(
      makeHttp({ get } as Partial<AxiosInstance>),
    );
    const res = await repo.listDepartments();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value[0].activeAssignmentCount).toBe(2);
    // 1 departments call + 2 paginated assignment pages
    expect(
      get.mock.calls.filter((c) => c[0] === EP.positionAssignments),
    ).toHaveLength(2);
  });
});

describe("StaffingRepository — assignment name join + fallbacks", () => {
  it("joins positionTitleName from the titles list and falls back memberName to memberId", async () => {
    const http = makeHttp({
      get: routedGet({
        positionTitles: envelope([
          titleDto({ positionTitleId: "pt-1", name: "Tổ trưởng" }),
        ]),
        positionAssignments: envelope([
          asgDto({ memberId: "m-777", positionTitleId: "pt-1" }),
        ]),
      }),
    });
    const repo = new StaffingRepository(http);
    const res = await repo.listAssignments();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value[0].positionTitleName).toBe("Tổ trưởng");
      // No BE source for member name → falls back to the raw memberId.
      expect(res.value[0].memberName).toBe("m-777");
    }
  });

  it("maps wire status ARCHIVED → domain REVOKED in listAssignments", async () => {
    const http = makeHttp({
      get: routedGet({
        positionTitles: envelope([titleDto()]),
        positionAssignments: envelope([asgDto({ status: "ARCHIVED" })]),
      }),
    });
    const repo = new StaffingRepository(http);
    const res = await repo.listAssignments();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value[0].status).toBe("REVOKED");
  });

  it("translates a REVOKED domain status filter to the wire's ARCHIVED", async () => {
    const get = routedGet({
      positionTitles: envelope([titleDto()]),
      positionAssignments: envelope([]),
    });
    const repo = new StaffingRepository(makeHttp({ get }));
    await repo.listAssignments({ status: "REVOKED" });
    const call = get.mock.calls.find((c) => c[0] === EP.positionAssignments);
    expect(
      (call?.[1] as { params?: { status?: string } })?.params?.status,
    ).toBe("ARCHIVED");
  });
});

describe("StaffingRepository — createAssignment derives scopeEntityType", () => {
  it("looks up the title's scopeType and sends it as scopeEntityType", async () => {
    const get = vi.fn(async (url: string) => {
      if (url === `${EP.positionTitles}/pt-1`)
        return titleDto({
          positionTitleId: "pt-1",
          scopeType: "DEPARTMENT",
          name: "Trưởng phòng",
        });
      throw new Error(`unrouted ${url}`);
    });
    const post = vi.fn(async (_url: string, _body?: unknown) => {
      void _url;
      void _body;
      return asgDto({
        positionTitleId: "pt-1",
        scopeEntityId: "dep-1",
        scopeEntityType: "DEPARTMENT",
      });
    });
    const repo = new StaffingRepository(makeHttp({ get, post }));
    const res = await repo.createAssignment({
      memberId: "m-101",
      positionTitleId: "pt-1",
      scopeEntityId: "dep-1",
      academicYearId: "ay-2025",
    });
    expect(res.ok).toBe(true);
    const body = post.mock.calls[0][1] as { scopeEntityType?: string };
    expect(body.scopeEntityType).toBe("DEPARTMENT");
    if (res.ok) {
      // positionTitleName reuses the fetched title; memberName falls back.
      expect(res.value.positionTitleName).toBe("Trưởng phòng");
      expect(res.value.memberName).toBe("m-101");
    }
  });
});

describe("StaffingRepository — happy paths", () => {
  it("createDepartment returns mapped entity with count 0", async () => {
    const http = makeHttp({
      post: vi
        .fn()
        .mockResolvedValue(depDto({ departmentId: "dep-9", name: "Tổ Lý" })),
    });
    const repo = new StaffingRepository(http);
    const res = await repo.createDepartment({
      name: "Tổ Lý",
      conceptLabelSuggested: null,
      conceptLabelCustom: null,
      subjectParentIds: [],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.id).toBe("dep-9");
      expect(res.value.activeAssignmentCount).toBe(0);
    }
  });

  it("copyAssignments returns mapped CopyResult", async () => {
    const http = makeHttp({
      post: vi.fn().mockResolvedValue({ copiedCount: 5, skippedCount: 1 }),
    });
    const repo = new StaffingRepository(http);
    const res = await repo.copyAssignments({
      sourceAcademicYearId: "ay-2024",
      targetAcademicYearId: "ay-2025",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toEqual({ copiedCount: 5, skippedCount: 1 });
  });
});

/**
 * Regression guard for the `{ raw: true }` config placement. The other suites
 * mock `http.get` to return an envelope directly, so they cannot catch `raw`
 * being nested inside `params` (isRawCall reads `config.raw` at the TOP level).
 * Here `http.get` runs the REAL `unwrapResponse` interceptor against the config
 * the repository actually passes: if a list call ever puts `raw` inside `params`,
 * isRawCall returns false → the envelope is unwrapped to its array → the repo's
 * `parseEnvelope(array)` throws → the call fails. This test only passes when
 * `raw` sits as a sibling of `params` (top-level config).
 */
describe("StaffingRepository — real interceptor pipeline (raw-flag placement)", () => {
  /** Mimics bootstrap/lib/http.ts: resolve get() to unwrapResponse(response). */
  function interceptedGet(bodyFor: (url: string) => unknown) {
    return vi.fn(
      async (url: string, config?: { params?: unknown; raw?: boolean }) =>
        unwrapResponse({
          data: bodyFor(url),
          config: { url, raw: config?.raw },
        }),
    );
  }

  it("listDepartments survives the real unwrap (raw is top-level)", async () => {
    const get = interceptedGet((url) => {
      if (url === EP.departments)
        return envelope([depDto({ departmentId: "dep-1" })]);
      if (url === EP.positionAssignments)
        return envelope([asgDto({ scopeEntityId: "dep-1" })]);
      throw new Error(`unrouted ${url}`);
    });
    const res = await new StaffingRepository(
      makeHttp({ get }),
    ).listDepartments();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value[0].id).toBe("dep-1");
  });

  it("listAssignments survives the real unwrap and joins the title name", async () => {
    const get = interceptedGet((url) => {
      if (url === EP.positionTitles)
        return envelope([
          titleDto({ positionTitleId: "pt-1", name: "Tổ trưởng" }),
        ]);
      if (url === EP.positionAssignments)
        return envelope([asgDto({ positionTitleId: "pt-1" })]);
      throw new Error(`unrouted ${url}`);
    });
    const res = await new StaffingRepository(
      makeHttp({ get }),
    ).listAssignments();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value[0].positionTitleName).toBe("Tổ trưởng");
  });
});

describe("StaffingRepository — error-code mapping (full Staffing matrix)", () => {
  const cases: Array<{
    code: string;
    status: number;
    expected: StaffingFailure["type"];
  }> = [
    // domain 404 / 409 / 403 / 422
    { code: "DEPARTMENT_NOT_FOUND", status: 404, expected: "not-found" },
    { code: "POSITION_TITLE_NOT_FOUND", status: 404, expected: "not-found" },
    {
      code: "POSITION_ASSIGNMENT_NOT_FOUND",
      status: 404,
      expected: "not-found",
    },
    {
      code: "DEPARTMENT_NAME_ALREADY_EXISTS",
      status: 409,
      expected: "already-exists",
    },
    {
      code: "POSITION_TITLE_NAME_ALREADY_EXISTS",
      status: 409,
      expected: "already-exists",
    },
    {
      code: "POSITION_ASSIGNMENT_ALREADY_EXISTS",
      status: 409,
      expected: "already-exists",
    },
    {
      code: "DEPARTMENT_HAS_ACTIVE_ASSIGNMENTS",
      status: 409,
      expected: "has-active-assignments",
    },
    {
      code: "POSITION_TITLE_HAS_ACTIVE_ASSIGNMENTS",
      status: 409,
      expected: "has-active-assignments",
    },
    { code: "DEPARTMENT_ARCHIVED", status: 409, expected: "archived" },
    { code: "POSITION_TITLE_ARCHIVED", status: 409, expected: "archived" },
    { code: "POSITION_TITLE_NOT_ACTIVE", status: 409, expected: "archived" },
    {
      code: "POSITION_TITLE_INVALID_PERMISSIONS",
      status: 422,
      expected: "invalid-permissions",
    },
    {
      code: "POSITION_TITLE_INVALID_SCOPE_TYPE",
      status: 400,
      expected: "invalid-scope-type",
    },
    { code: "MEMBER_NOT_TEACHER", status: 422, expected: "member-not-teacher" },
    {
      code: "ACADEMIC_YEAR_NOT_ACTIVE",
      status: 422,
      expected: "academic-year-not-active",
    },
    {
      code: "SCOPE_ENTITY_NOT_FOUND",
      status: 404,
      expected: "scope-entity-not-found",
    },
    { code: "POSITION_FORBIDDEN", status: 403, expected: "forbidden" },
    // value-object / format 400s → validation bucket
    { code: "DEPARTMENT_INVALID_ID", status: 400, expected: "validation" },
    { code: "DEPARTMENT_INVALID_NAME", status: 400, expected: "validation" },
    {
      code: "DEPARTMENT_INVALID_CONCEPT_LABEL",
      status: 400,
      expected: "validation",
    },
    { code: "POSITION_TITLE_INVALID_ID", status: 400, expected: "validation" },
    {
      code: "POSITION_TITLE_INVALID_NAME",
      status: 400,
      expected: "validation",
    },
    {
      code: "POSITION_ASSIGNMENT_INVALID_ID",
      status: 400,
      expected: "validation",
    },
    {
      code: "POSITION_ASSIGNMENT_INVALID_MEMBER_ID",
      status: 400,
      expected: "validation",
    },
    {
      code: "POSITION_ASSIGNMENT_INVALID_ACADEMIC_YEAR_ID",
      status: 400,
      expected: "validation",
    },
    {
      code: "POSITION_ASSIGNMENT_INVALID_SCOPE_ENTITY_ID",
      status: 400,
      expected: "validation",
    },
    // internal → unknown (not user-actionable)
    { code: "STAFFING_INVALID_TENANT_ID", status: 400, expected: "unknown" },
    // generic status fallbacks + transport
    { code: "SOME_OTHER_NOT_FOUND", status: 404, expected: "not-found" },
    { code: "SOME_OTHER_FORBIDDEN", status: 403, expected: "forbidden" },
    { code: "NETWORK_ERROR", status: 0, expected: "network-error" },
    { code: "WEIRD_UNKNOWN", status: 500, expected: "unknown" },
  ];

  for (const { code, status, expected } of cases) {
    it(`maps ${code} (${status}) → ${expected}`, async () => {
      const http = makeHttp({
        post: vi.fn().mockRejectedValue(apiError(code, status)),
      });
      const repo = new StaffingRepository(http);
      const res = await repo.createDepartment({
        name: "x",
        conceptLabelSuggested: null,
        conceptLabelCustom: null,
        subjectParentIds: [],
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failure.type).toBe(expected);
    });
  }

  it("maps retryable 502 → network-error", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("BAD_GATEWAY", 502, true)),
    });
    const repo = new StaffingRepository(http);
    const res = await repo.createDepartment({
      name: "x",
      conceptLabelSuggested: null,
      conceptLabelCustom: null,
      subjectParentIds: [],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("network-error");
  });
});
