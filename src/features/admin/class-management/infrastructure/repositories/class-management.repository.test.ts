/**
 * Integration tests — ClassManagementRepository (TR-026, US-E06.3 / US-E18.4).
 * Real wire: `classId`/`academicYearLabel`; `studentCount`/homeroom fields are
 * NOT on `ClassResponse` — derived via `GET .../students` (roster count) and
 * `GET .../homeroom-teacher` fan-outs. The http interceptor unwraps the
 * envelope; repositories receive the payload directly (or the full envelope
 * for `{ raw: true }` calls) and a normalised ApiError on failure. Mock at
 * that boundary; branch on error.code.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { CLASS_EP } from "@/bootstrap/endpoint/class.endpoint";
import { ApiError, unwrapResponse } from "@/bootstrap/lib/api-envelope";
import type { ClassResponseDto } from "../dtos/class-response.dto";
import type { EnrollmentResponseDto } from "../dtos/enrollment-response.dto";
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

function enrollmentDto(
  over: Partial<EnrollmentResponseDto> = {},
): EnrollmentResponseDto {
  return {
    enrollmentId: "enr-1",
    classId: "cls-10a1",
    studentMemberId: "student-1",
    academicYearLabel: "2025-2026",
    enrolledAt: "2026-01-01T00:00:00Z",
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

/** GET dispatcher: routes by URL suffix so a single mock covers list + fan-out calls. */
function routedGet(routes: {
  classes?: () => unknown;
  students?: (classId: string) => unknown;
  homeroom?: (classId: string) => unknown;
  classDetail?: (classId: string) => unknown;
}) {
  return vi.fn(async (url: string) => {
    if (url === CLASS_EP.classes) return routes.classes?.();
    const studentsMatch = url.match(/classes\/([^/]+)\/students$/);
    if (studentsMatch) return routes.students?.(studentsMatch[1]);
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

describe("ClassManagementRepository — listClasses (enrichment fan-out)", () => {
  it("derives studentCount + homeroom per row from the roster + homeroom fan-outs", async () => {
    const get = routedGet({
      classes: () => envelope([classDto()]),
      students: () =>
        envelope([enrollmentDto(), enrollmentDto({ enrollmentId: "enr-2" })]),
      homeroom: () => homeroomDto(),
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
      expect(cls.homeroomTeacherName).toBe("member-uuid-1"); // no IAM name source
    }
  });

  it("treats 404 CLASS_ASSIGNMENT_NOT_FOUND as no homeroom (null), not a failure", async () => {
    const get = routedGet({
      classes: () => envelope([classDto()]),
      students: () => envelope([]),
      homeroom: () => apiError("CLASS_ASSIGNMENT_NOT_FOUND", 404),
    });
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.listClasses({});
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.data[0].homeroomTeacherId).toBeNull();
      expect(res.value.data[0].homeroomTeacherName).toBeNull();
      expect(res.value.data[0].studentCount).toBe(0);
    }
  });

  it("paginates the roster to completion before counting", async () => {
    const studentsCalls = vi.fn();
    const get = routedGet({
      classes: () => envelope([classDto()]),
      students: () => {
        studentsCalls();
        const call = studentsCalls.mock.calls.length;
        return call === 1
          ? envelope([enrollmentDto()], true, "cur-roster-2")
          : envelope([enrollmentDto({ enrollmentId: "enr-2" })]);
      },
      homeroom: () => apiError("CLASS_ASSIGNMENT_NOT_FOUND", 404),
    });
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.listClasses({});
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.data[0].studentCount).toBe(2);
    expect(studentsCalls).toHaveBeenCalledTimes(2);
  });

  it("applies gradeLevel client-side (no server-side filter on the wire)", async () => {
    const get = routedGet({
      classes: () =>
        envelope([
          classDto({ classId: "a", gradeLevel: 10 }),
          classDto({ classId: "b", gradeLevel: 11 }),
        ]),
      students: () => envelope([]),
      homeroom: () => apiError("CLASS_ASSIGNMENT_NOT_FOUND", 404),
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
      students: () => envelope([]),
      homeroom: () => apiError("CLASS_ASSIGNMENT_NOT_FOUND", 404),
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
      params: { academicYear: "2025-2026", cursor: undefined },
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

  it("defaults studentCount 0 and no homeroom for a brand-new class (no extra round-trips)", async () => {
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
  it("sends both name+gradeLevel when both provided, then re-enriches", async () => {
    const patch = vi.fn().mockResolvedValue(classDto({ name: "10A1-x" }));
    const get = routedGet({
      students: () => envelope([enrollmentDto()]),
      homeroom: () => apiError("CLASS_ASSIGNMENT_NOT_FOUND", 404),
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
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.studentCount).toBe(1);
  });

  it("backfills a missing field via GET before PATCH (real API requires both)", async () => {
    const patch = vi.fn().mockResolvedValue(classDto({ gradeLevel: 11 }));
    const get = routedGet({
      classDetail: () => classDto({ name: "10A1", gradeLevel: 10 }),
      students: () => envelope([]),
      homeroom: () => apiError("CLASS_ASSIGNMENT_NOT_FOUND", 404),
    });
    const repo = new ClassManagementRepository(makeHttp({ patch, get }));
    await repo.renameClass("cls-10a1", { gradeLevel: 11 });
    expect(patch).toHaveBeenCalledWith(CLASS_EP.class("cls-10a1"), {
      name: "10A1",
      gradeLevel: 11,
    });
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

describe("ClassManagementRepository — listTeachers (mock-first, permanently)", () => {
  it("always fails (real repo never serves this — DI factory delegates to mock)", async () => {
    const repo = new ClassManagementRepository(makeHttp());
    const res = await repo.listTeachers();
    expect(res.ok).toBe(false);
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
      if (url.endsWith("/students")) return envelope([]);
      throw apiError("CLASS_ASSIGNMENT_NOT_FOUND", 404);
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
