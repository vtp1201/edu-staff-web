/**
 * Integration tests — ClassManagementRepository (TR-026, US-E06.3 / US-E18.4,
 * rewired US-E18.30). Real wire: `classId`/`academicYearLabel`, and since BE
 * US-173 `studentCount`/`homeroomTeacherId`/`homeroomTeacherName` come
 * directly on `ClassResponse` for the LIST and GET endpoints — the old 2×N
 * `GET .../students` + `GET .../homeroom-teacher` fan-out is gone. The
 * create/update endpoints return those three fields unenriched (`0`/`null`)
 * by BE construction. The http interceptor unwraps the envelope; repositories
 * receive the payload directly (or the full envelope for `{ raw: true }`
 * calls) and a normalised ApiError on failure. Mock at that boundary; branch
 * on error.code.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { CLASS_EP } from "@/bootstrap/endpoint/class.endpoint";
import { ApiError, unwrapResponse } from "@/bootstrap/lib/api-envelope";
import type { DirectoryMember } from "@/features/iam-directory/domain/entities/directory-member.entity";
import type { ClassResponseDto } from "../dtos/class-response.dto";
import type { HomeroomAssignmentResponseDto } from "../dtos/homeroom-assignment-response.dto";
import { ClassManagementRepository } from "./class-management.repository";

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

function classDto(over: Partial<ClassResponseDto> = {}): ClassResponseDto {
  return {
    classId: "cls-10a1",
    tenantId: "tenant-1",
    name: "10A1",
    gradeLevel: 10,
    academicYearLabel: "2025-2026",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    studentCount: 0,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
    ...over,
  };
}

function homeroomDto(
  over: Partial<HomeroomAssignmentResponseDto> = {},
): HomeroomAssignmentResponseDto {
  return {
    classId: "cls-10a1",
    teacherMemberId: "member-uuid-1",
    assignedAt: "2026-01-01T00:00:00Z",
    assignedBy: "admin-uuid",
    ...over,
  };
}

function envelope<T>(
  data: T,
  hasMore = false,
  nextCursor: string | null = null,
) {
  return {
    success: true,
    data,
    error: null,
    meta: {
      requestId: "req-test",
      pagination: {
        nextCursor: hasMore ? (nextCursor ?? "cur-2") : null,
        hasMore,
      },
    },
  };
}

/** GET dispatcher: routes by URL suffix so a single mock covers list + detail calls. */
function routedGet(routes: {
  classes?: () => unknown;
  homeroom?: (classId: string) => unknown;
  classDetail?: (classId: string) => unknown;
}) {
  return vi.fn(async (url: string) => {
    if (url === CLASS_EP.classes) return routes.classes?.();
    const homeroomMatch = url.match(/classes\/([^/]+)\/homeroom-teacher$/);
    if (homeroomMatch) {
      const result = routes.homeroom?.(homeroomMatch[1]);
      if (result instanceof Error) throw result;
      return result;
    }
    const detailMatch = url.match(/classes\/([^/]+)$/);
    if (detailMatch) return routes.classDetail?.(detailMatch[1]);
    throw new Error(`unhandled GET ${url}`);
  }) as unknown as AxiosInstance["get"];
}

describe("ClassManagementRepository — listClasses (wire-enriched, no fan-out)", () => {
  it("reads studentCount + homeroom per row straight off the enriched list response", async () => {
    const get = routedGet({
      classes: () =>
        envelope([
          classDto({
            studentCount: 2,
            homeroomTeacherId: "member-uuid-1",
            homeroomTeacherName: "Nguyễn Thị Lan",
          }),
        ]),
    });
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.listClasses({});
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.data).toHaveLength(1);
      const cls = res.value.data[0];
      expect(cls.id).toBe("cls-10a1");
      expect(cls.academicYear).toBe("2025-2026");
      expect(cls.studentCount).toBe(2);
      expect(cls.homeroomTeacherId).toBe("member-uuid-1");
      expect(cls.homeroomTeacherName).toBe("Nguyễn Thị Lan");
    }
  });

  /**
   * The whole point of US-E18.30: the old implementation issued
   * `GET .../students` + `GET .../homeroom-teacher` for EVERY row (2×N). This
   * asserts the CALL COUNT, not just the result, so re-introducing any
   * per-row fan-out fails here instead of silently costing 2×N round-trips.
   */
  it("issues EXACTLY ONE HTTP call for a multi-row page (no 2×N fan-out)", async () => {
    const get = routedGet({
      classes: () =>
        envelope([
          classDto({ classId: "a", studentCount: 30 }),
          classDto({ classId: "b", studentCount: 28 }),
          classDto({ classId: "c", studentCount: 26 }),
        ]),
    });
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.listClasses({});

    expect(res.ok).toBe(true);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(CLASS_EP.classes, expect.anything());
  });

  it("reports no homeroom teacher when the wire id is null", async () => {
    const get = routedGet({ classes: () => envelope([classDto()]) });
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.listClasses({});
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.data[0].homeroomTeacherId).toBeNull();
      expect(res.value.data[0].homeroomTeacherName).toBeNull();
      expect(res.value.data[0].studentCount).toBe(0);
    }
  });

  it("keeps a class ASSIGNED when only the resolved name degraded to null", async () => {
    const get = routedGet({
      classes: () =>
        envelope([
          classDto({
            homeroomTeacherId: "member-uuid-1",
            homeroomTeacherName: null,
          }),
        ]),
    });
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.listClasses({});
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.data[0].homeroomTeacherId).toBe("member-uuid-1");
      expect(res.value.data[0].homeroomTeacherName).toBe("member-uuid-1");
    }
  });

  it("applies gradeLevel client-side (no server-side filter on the wire)", async () => {
    const get = routedGet({
      classes: () =>
        envelope([
          classDto({ classId: "a", gradeLevel: 10 }),
          classDto({ classId: "b", gradeLevel: 11 }),
        ]),
    });
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.listClasses({ gradeLevel: 11 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.data).toHaveLength(1);
      expect(res.value.data[0].id).toBe("b");
    }
  });

  it("reads pagination for the class list itself", async () => {
    const get = routedGet({
      classes: () => envelope([classDto()], true, "cur-classes-2"),
    });
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.listClasses({});
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.hasMore).toBe(true);
      expect(res.value.nextCursor).toBe("cur-classes-2");
    }
  });

  it("passes raw at config top-level for the list call (US-E18.19 regression guard)", async () => {
    const get = vi.fn().mockResolvedValue(envelope([]));
    const repo = new ClassManagementRepository(makeHttp({ get }));
    await repo.listClasses({ academicYear: "2025-2026" });
    expect(get).toHaveBeenCalledWith(CLASS_EP.classes, {
      params: {
        academicYear: "2025-2026",
        cursor: undefined,
        limit: undefined,
      },
      raw: true,
    });
  });

  it("threads an explicit limit into the query params (US-E13.8)", async () => {
    const get = vi.fn().mockResolvedValue(envelope([]));
    const repo = new ClassManagementRepository(makeHttp({ get }));
    await repo.listClasses({
      academicYear: "2025-2026",
      cursor: "cur-2",
      limit: 100,
    });
    expect(get).toHaveBeenCalledWith(CLASS_EP.classes, {
      params: { academicYear: "2025-2026", cursor: "cur-2", limit: 100 },
      raw: true,
    });
  });

  it("maps a network error → network-error failure", async () => {
    const get = vi
      .fn()
      .mockRejectedValue(
        new ApiError({ code: "NETWORK_ERROR", message: "x", retryable: true }),
      );
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.listClasses({});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("network-error");
  });

  it("maps CLASS_NOT_FOUND (404) → not-found failure", async () => {
    const get = vi.fn().mockRejectedValue(apiError("CLASS_NOT_FOUND", 404));
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.listClasses({});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("not-found");
  });
});

describe("ClassManagementRepository — createClass", () => {
  it("renames academicYear to academicYearLabel in the request body", async () => {
    const post = vi.fn().mockResolvedValue(classDto({ classId: "cls-new" }));
    const repo = new ClassManagementRepository(makeHttp({ post }));
    await repo.createClass({
      name: "10A3",
      gradeLevel: 10,
      academicYear: "2025-2026",
    });
    expect(post).toHaveBeenCalledWith(CLASS_EP.classes, {
      name: "10A3",
      gradeLevel: 10,
      academicYearLabel: "2025-2026",
    });
  });

  it("maps the unenriched create response (0 / null) with no extra round-trips", async () => {
    // BE returns `studentCount: 0` + null homeroom by construction on POST
    // (openapi `ClassResponse`: "the create/update endpoints return `0`/`null`
    // unenriched") — which is also the truth for a brand-new class.
    const post = vi.fn().mockResolvedValue(classDto({ classId: "cls-new" }));
    const get = vi.fn();
    const repo = new ClassManagementRepository(makeHttp({ post, get }));
    const res = await repo.createClass({
      name: "10A3",
      gradeLevel: 10,
      academicYear: "2025-2026",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.studentCount).toBe(0);
      expect(res.value.homeroomTeacherId).toBeNull();
    }
    expect(post).toHaveBeenCalledTimes(1);
    expect(get).not.toHaveBeenCalled();
  });

  it("maps CLASS_ALREADY_EXISTS (409) → duplicate-class failure", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(apiError("CLASS_ALREADY_EXISTS", 409));
    const repo = new ClassManagementRepository(makeHttp({ post }));
    const res = await repo.createClass({
      name: "10A1",
      gradeLevel: 10,
      academicYear: "2025-2026",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("duplicate-class");
  });

  it("maps CLASS_GRADE_LEVEL_OUTSIDE_TENANT_RANGE (422) → grade-level-out-of-range", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(
        apiError("CLASS_GRADE_LEVEL_OUTSIDE_TENANT_RANGE", 422),
      );
    const repo = new ClassManagementRepository(makeHttp({ post }));
    const res = await repo.createClass({
      name: "10A1",
      gradeLevel: 99,
      academicYear: "2025-2026",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("grade-level-out-of-range");
  });

  it("maps SCHOOL_GRADE_LEVEL_RANGE_NOT_CONFIGURED (422) → grade-level-out-of-range", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(
        apiError("SCHOOL_GRADE_LEVEL_RANGE_NOT_CONFIGURED", 422),
      );
    const repo = new ClassManagementRepository(makeHttp({ post }));
    const res = await repo.createClass({
      name: "10A1",
      gradeLevel: 10,
      academicYear: "2025-2026",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("grade-level-out-of-range");
  });

  it("maps CLASS_INVALID_NAME (400) → invalid-name failure", async () => {
    const post = vi.fn().mockRejectedValue(apiError("CLASS_INVALID_NAME", 400));
    const repo = new ClassManagementRepository(makeHttp({ post }));
    const res = await repo.createClass({
      name: "",
      gradeLevel: 10,
      academicYear: "2025-2026",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("invalid-name");
  });

  it("maps CLASS_INVALID_ACADEMIC_YEAR (400) → invalid-academic-year failure", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(apiError("CLASS_INVALID_ACADEMIC_YEAR", 400));
    const repo = new ClassManagementRepository(makeHttp({ post }));
    const res = await repo.createClass({
      name: "10A1",
      gradeLevel: 10,
      academicYear: "x".repeat(40),
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("invalid-academic-year");
  });

  it("maps CLASS_FORBIDDEN (403) → forbidden failure", async () => {
    const post = vi.fn().mockRejectedValue(apiError("CLASS_FORBIDDEN", 403));
    const repo = new ClassManagementRepository(makeHttp({ post }));
    const res = await repo.createClass({
      name: "10A1",
      gradeLevel: 10,
      academicYear: "2025-2026",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("forbidden");
  });
});

describe("ClassManagementRepository — renameClass", () => {
  it("sends both name+gradeLevel when both provided, then re-reads the enriched class ONCE", async () => {
    // PATCH's own response is unenriched (`0`/null) per the BE contract, so
    // the row would lose its student count — one enriched `GET /classes/{id}`
    // restores it. ONE call, replacing the old 2-call roster+homeroom fan-out.
    const patch = vi.fn().mockResolvedValue(classDto({ name: "10A1-x" }));
    const get = routedGet({
      classDetail: () =>
        classDto({
          name: "10A1-x",
          studentCount: 1,
          homeroomTeacherId: "member-uuid-1",
          homeroomTeacherName: "Nguyễn Thị Lan",
        }),
    });
    const repo = new ClassManagementRepository(makeHttp({ patch, get }));
    const res = await repo.renameClass("cls-10a1", {
      name: "10A1-x",
      gradeLevel: 10,
    });
    expect(patch).toHaveBeenCalledWith(CLASS_EP.class("cls-10a1"), {
      name: "10A1-x",
      gradeLevel: 10,
    });
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(CLASS_EP.class("cls-10a1"));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.name).toBe("10A1-x");
      expect(res.value.studentCount).toBe(1);
      expect(res.value.homeroomTeacherName).toBe("Nguyễn Thị Lan");
    }
  });

  it("backfills a missing field via GET before PATCH (real API requires both)", async () => {
    const patch = vi.fn().mockResolvedValue(classDto({ gradeLevel: 11 }));
    const get = routedGet({
      classDetail: () => classDto({ name: "10A1", gradeLevel: 10 }),
    });
    const repo = new ClassManagementRepository(makeHttp({ patch, get }));
    await repo.renameClass("cls-10a1", { gradeLevel: 11 });
    expect(patch).toHaveBeenCalledWith(CLASS_EP.class("cls-10a1"), {
      name: "10A1",
      gradeLevel: 11,
    });
    // backfill read + post-PATCH enriched re-read — and nothing else.
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("maps CLASS_ARCHIVED (409) → class-archived failure", async () => {
    const patch = vi.fn().mockRejectedValue(apiError("CLASS_ARCHIVED", 409));
    const repo = new ClassManagementRepository(makeHttp({ patch }));
    const res = await repo.renameClass("cls-10a1", {
      name: "x",
      gradeLevel: 10,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("class-archived");
  });

  it("maps CLASS_NOT_FOUND (404) → not-found failure", async () => {
    const patch = vi.fn().mockRejectedValue(apiError("CLASS_NOT_FOUND", 404));
    const repo = new ClassManagementRepository(makeHttp({ patch }));
    const res = await repo.renameClass("cls-missing", {
      name: "x",
      gradeLevel: 10,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("not-found");
  });
});

describe("ClassManagementRepository — archiveClass", () => {
  it("posts to the archive endpoint, no body", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const repo = new ClassManagementRepository(makeHttp({ post }));
    const res = await repo.archiveClass("cls-10a1");
    expect(post).toHaveBeenCalledWith(CLASS_EP.classArchive("cls-10a1"));
    expect(res.ok).toBe(true);
  });

  it("maps CLASS_NOT_FOUND (404) → not-found failure", async () => {
    const post = vi.fn().mockRejectedValue(apiError("CLASS_NOT_FOUND", 404));
    const repo = new ClassManagementRepository(makeHttp({ post }));
    const res = await repo.archiveClass("cls-missing");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("not-found");
  });
});

describe("ClassManagementRepository — assignHomeroomTeacher", () => {
  it("sends teacherMemberId (renamed from teacherUserId at the domain layer)", async () => {
    const put = vi.fn().mockResolvedValue(homeroomDto());
    const repo = new ClassManagementRepository(makeHttp({ put }));
    await repo.assignHomeroomTeacher("cls-10a1", "u-teacher-1");
    expect(put).toHaveBeenCalledWith(
      CLASS_EP.classHomeroomTeacher("cls-10a1"),
      {
        teacherMemberId: "u-teacher-1",
      },
    );
  });

  it("maps CLASS_ASSIGNMENT_TEACHER_NOT_FOUND (404) → homeroom-teacher-not-found", async () => {
    const put = vi
      .fn()
      .mockRejectedValue(apiError("CLASS_ASSIGNMENT_TEACHER_NOT_FOUND", 404));
    const repo = new ClassManagementRepository(makeHttp({ put }));
    const res = await repo.assignHomeroomTeacher("cls-10a1", "fake-mock-id");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("homeroom-teacher-not-found");
  });

  it("maps CLASS_ASSIGNMENT_NOT_TEACHER_ROLE (422) → assignee-not-teacher", async () => {
    const put = vi
      .fn()
      .mockRejectedValue(apiError("CLASS_ASSIGNMENT_NOT_TEACHER_ROLE", 422));
    const repo = new ClassManagementRepository(makeHttp({ put }));
    const res = await repo.assignHomeroomTeacher("cls-10a1", "u-student-1");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("assignee-not-teacher");
  });

  it("maps CLASS_ARCHIVED (409) → class-archived failure", async () => {
    const put = vi.fn().mockRejectedValue(apiError("CLASS_ARCHIVED", 409));
    const repo = new ClassManagementRepository(makeHttp({ put }));
    const res = await repo.assignHomeroomTeacher("cls-archived", "u-teacher-1");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("class-archived");
  });
});

describe("ClassManagementRepository — getHomeroomTeacher", () => {
  it("maps to a TeacherMember falling back to the raw member id", async () => {
    const get = vi.fn().mockResolvedValue(homeroomDto());
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.getHomeroomTeacher("cls-10a1");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toEqual({
        userId: "member-uuid-1",
        displayName: "member-uuid-1",
        email: "",
      });
    }
  });

  it("returns ok(null) for 404 CLASS_ASSIGNMENT_NOT_FOUND (no homeroom)", async () => {
    const get = vi
      .fn()
      .mockRejectedValue(apiError("CLASS_ASSIGNMENT_NOT_FOUND", 404));
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.getHomeroomTeacher("cls-10a2");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toBeNull();
  });

  it("maps CLASS_NOT_FOUND (404, class itself missing) → not-found failure", async () => {
    const get = vi.fn().mockRejectedValue(apiError("CLASS_NOT_FOUND", 404));
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.getHomeroomTeacher("cls-missing");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("not-found");
  });
});

/**
 * US-E18.23 — `listTeachers` is no longer mock-first. It delegates to the
 * `iam-directory` search collaborator injected by `class-management.di.ts`
 * (which pins `role: "TEACHER"` and the tenant id from the token claim), and
 * translates `IamDirectoryFailure` into this feature's own union.
 */
describe("ClassManagementRepository — listTeachers (real, via iam-directory)", () => {
  function directoryMember(
    over: Partial<DirectoryMember> = {},
  ): DirectoryMember {
    return {
      memberId: "u-1",
      userId: "u-1",
      displayName: "Nguyễn Thị Giáo",
      email: "giao@example.com",
      roles: ["TEACHER"],
      status: "ACTIVE",
      ...over,
    };
  }

  it("forwards `search` to the directory collaborator and maps to TeacherMember", async () => {
    const search = vi.fn().mockResolvedValue({
      ok: true,
      value: [
        directoryMember(),
        directoryMember({
          memberId: "u-2",
          userId: "u-2",
          displayName: "Trần Văn Dạy",
          email: "day@example.com",
          roles: ["TEACHER", "MANAGER"],
        }),
      ],
    });
    const repo = new ClassManagementRepository(makeHttp(), search);

    const res = await repo.listTeachers({ search: "ngu" });

    expect(search).toHaveBeenCalledExactlyOnceWith({ search: "ngu" });
    expect(res).toEqual({
      ok: true,
      value: [
        {
          userId: "u-1",
          displayName: "Nguyễn Thị Giáo",
          email: "giao@example.com",
        },
        {
          userId: "u-2",
          displayName: "Trần Văn Dạy",
          email: "day@example.com",
        },
      ],
    });
  });

  it("makes NO direct HTTP call of its own (the collaborator owns the wire)", async () => {
    const get = vi.fn();
    const search = vi.fn().mockResolvedValue({ ok: true, value: [] });

    await new ClassManagementRepository(makeHttp({ get }), search).listTeachers(
      {},
    );

    expect(get).not.toHaveBeenCalled();
  });

  it("maps a directory RBAC denial to { type: 'forbidden' }", async () => {
    const search = vi
      .fn()
      .mockResolvedValue({ ok: false, failure: { type: "forbidden" } });
    const repo = new ClassManagementRepository(makeHttp(), search);

    expect(await repo.listTeachers({})).toEqual({
      ok: false,
      failure: { type: "forbidden" },
    });
  });

  it("maps a directory network error to { type: 'network-error' }", async () => {
    const search = vi
      .fn()
      .mockResolvedValue({ ok: false, failure: { type: "network-error" } });
    const repo = new ClassManagementRepository(makeHttp(), search);

    expect(await repo.listTeachers({})).toEqual({
      ok: false,
      failure: { type: "network-error" },
    });
  });

  it("maps any other directory failure to { type: 'unknown' }", async () => {
    const search = vi
      .fn()
      .mockResolvedValue({ ok: false, failure: { type: "too-many-ids" } });
    const repo = new ClassManagementRepository(makeHttp(), search);

    expect(await repo.listTeachers({})).toEqual({
      ok: false,
      failure: { type: "unknown" },
    });
  });

  it("fails with `unknown` when no collaborator was injected (misconfigured DI)", async () => {
    const res = await new ClassManagementRepository(makeHttp()).listTeachers(
      {},
    );

    expect(res).toEqual({ ok: false, failure: { type: "unknown" } });
  });
});

/**
 * Regression guard for `{ raw: true }` config placement (US-E18.19 bug
 * class). Runs the REAL `unwrapResponse` interceptor against the config the
 * repo actually passes for the list call.
 */
describe("ClassManagementRepository — real interceptor pipeline (raw-flag placement)", () => {
  function interceptedGet(bodyFor: (url: string) => unknown) {
    return vi.fn(
      async (url: string, config?: { params?: unknown; raw?: boolean }) =>
        unwrapResponse({
          data: bodyFor(url),
          config: { url, raw: config?.raw },
        }),
    ) as unknown as AxiosInstance["get"];
  }

  it("listClasses survives the real unwrap (raw top-level, filters kept in params)", async () => {
    const get = interceptedGet((url) => {
      if (url === CLASS_EP.classes)
        return envelope([classDto()], true, "cur-2");
      throw apiError(`unexpected GET ${url}`, 500);
    });
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.listClasses({ academicYear: "2025-2026" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.data[0].id).toBe("cls-10a1");
      expect(res.value.hasMore).toBe(true);
    }
  });
});
