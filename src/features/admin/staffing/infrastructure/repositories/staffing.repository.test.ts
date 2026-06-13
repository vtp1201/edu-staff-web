/**
 * Integration tests — StaffingRepository error-code mapping (US-E06.8).
 * The http interceptor unwraps the envelope; repositories receive the payload
 * directly and a normalised ApiError on failure. Mock at that boundary; assert
 * each error code maps to the correct StaffingFailure type (branch on code).
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { StaffingFailure } from "../../domain/failures/staffing.failure";
import { StaffingRepository } from "./staffing.repository";

function apiError(code: string, status: number, retryable = false) {
  return new ApiError({ code, message: code, retryable, status });
}

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

function makeListEnvelope<T>(items: T[]) {
  return {
    success: true,
    data: items,
    error: null,
    meta: {
      requestId: "req-test",
      pagination: { nextCursor: null, hasMore: false },
    },
  };
}

describe("StaffingRepository — happy paths", () => {
  it("listDepartments maps payload from envelope", async () => {
    const http = makeHttp({
      get: vi.fn().mockResolvedValue(
        makeListEnvelope([
          {
            id: "dep-1",
            name: "Tổ Toán",
            conceptLabel: null,
            subjectParentIds: ["sp-math"],
            status: "ACTIVE",
            activeAssignmentCount: 1,
          },
        ]),
      ),
    });
    const repo = new StaffingRepository(http);
    const res = await repo.listDepartments();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toHaveLength(1);
      expect(res.value[0].name).toBe("Tổ Toán");
    }
  });

  it("createDepartment returns mapped entity", async () => {
    const http = makeHttp({
      post: vi.fn().mockResolvedValue({
        id: "dep-9",
        name: "Tổ Lý",
        conceptLabel: null,
        subjectParentIds: [],
        status: "ACTIVE",
        activeAssignmentCount: 0,
      }),
    });
    const repo = new StaffingRepository(http);
    const res = await repo.createDepartment({
      name: "Tổ Lý",
      conceptLabel: null,
      subjectParentIds: [],
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.id).toBe("dep-9");
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

describe("StaffingRepository — error-code mapping", () => {
  const cases: Array<{
    code: string;
    status: number;
    expected: StaffingFailure["type"];
  }> = [
    {
      code: "DEPARTMENT_NAME_ALREADY_EXISTS",
      status: 409,
      expected: "already-exists",
    },
    { code: "DEPARTMENT_NOT_FOUND", status: 404, expected: "not-found" },
    {
      code: "DEPARTMENT_HAS_ACTIVE_ASSIGNMENTS",
      status: 409,
      expected: "has-active-assignments",
    },
    {
      code: "POSITION_TITLE_NAME_ALREADY_EXISTS",
      status: 409,
      expected: "already-exists",
    },
    {
      code: "POSITION_TITLE_HAS_ACTIVE_ASSIGNMENTS",
      status: 409,
      expected: "has-active-assignments",
    },
    {
      code: "POSITION_TITLE_INVALID_PERMISSIONS",
      status: 422,
      expected: "invalid-permissions",
    },
    {
      code: "POSITION_ASSIGNMENT_ALREADY_EXISTS",
      status: 409,
      expected: "already-exists",
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
        conceptLabel: null,
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
      conceptLabel: null,
      subjectParentIds: [],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("network-error");
  });
});
