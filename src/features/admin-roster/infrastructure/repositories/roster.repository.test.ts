/**
 * Integration tests — RosterRepository error-code mapping, homeroom-name
 * fan-out, and two-step transfer (US-E06.7 + US-E18.5 real-wire remap).
 * The http interceptor unwraps the envelope; repositories receive the payload
 * directly and a normalised ApiError on failure. Mock at that boundary.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError, unwrapResponse } from "@/bootstrap/lib/api-envelope";
import { RosterRepository } from "./roster.repository";

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

/** Minimal success envelope for paginated list calls ({ raw: true }). */
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

/** Wire `HomeroomAssignmentResponse` — carries only teacherMemberId (raw uuid). */
function homeroom(classId: string, teacherMemberId: string) {
  return {
    classId,
    teacherMemberId,
    assignedAt: "2025-08-01T00:00:00Z",
    assignedBy: "admin-uuid",
  };
}

const CLASSES_URL = "/core/api/v1/classes";
const homeroomUrl = (classId: string) =>
  `/core/api/v1/classes/${classId}/homeroom-teacher`;

describe("RosterRepository — getClasses (US-E18.5 real wire)", () => {
  it("maps the wire envelope (classId/academicYearLabel) + fans out one homeroom GET per class", async () => {
    const get = vi.fn(async (url: string) => {
      if (url === CLASSES_URL) {
        return makeListEnvelope([
          {
            classId: "cls-10a1",
            name: "10A1",
            gradeLevel: 10,
            academicYearLabel: "2025–2026",
          },
          {
            classId: "cls-10b3",
            name: "10B3",
            gradeLevel: 10,
            academicYearLabel: "2025–2026",
          },
        ]);
      }
      if (url === homeroomUrl("cls-10a1")) {
        return homeroom("cls-10a1", "teacher-uuid-1");
      }
      // cls-10b3 → no homeroom assignment
      throw apiError("CLASS_ASSIGNMENT_NOT_FOUND", 404);
    }) as unknown as AxiosInstance["get"];
    const repo = new RosterRepository(makeHttp({ get }));
    const res = await repo.getClasses({});
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(2);
      expect(res.data[0]).toEqual({
        id: "cls-10a1",
        name: "10A1",
        gradeLevel: 10,
        homeroomTeacher: "teacher-uuid-1",
        year: "2025–2026",
      });
      // 404 CLASS_ASSIGNMENT_NOT_FOUND → no homeroom → null (not a failure)
      expect(res.data[1].homeroomTeacher).toBeNull();
    }
    // 1 list GET + 1 homeroom GET per class
    expect(get).toHaveBeenCalledTimes(3);
  });

  it("passes academicYear to the list API (TR-031)", async () => {
    const get = vi.fn().mockResolvedValue(makeListEnvelope([]));
    const repo = new RosterRepository(makeHttp({ get }));
    await repo.getClasses({ academicYear: "2025-2026" });
    expect(get).toHaveBeenCalledWith(
      CLASSES_URL,
      expect.objectContaining({
        params: expect.objectContaining({ academicYear: "2025-2026" }),
      }),
    );
  });

  it("CLASS_FORBIDDEN (403) → forbidden (US-041 read authorization)", async () => {
    const get = vi.fn().mockRejectedValue(apiError("CLASS_FORBIDDEN", 403));
    const repo = new RosterRepository(makeHttp({ get }));
    const res = await repo.getClasses({});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("forbidden");
  });

  it("ROSTER_ACCESS_FORBIDDEN (403) → forbidden", async () => {
    const get = vi
      .fn()
      .mockRejectedValue(apiError("ROSTER_ACCESS_FORBIDDEN", 403));
    const repo = new RosterRepository(makeHttp({ get }));
    const res = await repo.getClasses({});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("forbidden");
  });

  it("CLASS_NOT_FOUND (404) → not-found", async () => {
    const get = vi.fn().mockRejectedValue(apiError("CLASS_NOT_FOUND", 404));
    const repo = new RosterRepository(makeHttp({ get }));
    const res = await repo.getClasses({});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("not-found");
  });

  it("401 → unauthorized", async () => {
    const get = vi.fn().mockRejectedValue(apiError("UNAUTHORIZED", 401));
    const repo = new RosterRepository(makeHttp({ get }));
    const res = await repo.getClasses({});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("unauthorized");
  });

  it("transport failure → network-error", async () => {
    const get = vi
      .fn()
      .mockRejectedValue(
        new ApiError({ code: "NETWORK_ERROR", message: "x", retryable: true }),
      );
    const repo = new RosterRepository(makeHttp({ get }));
    const res = await repo.getClasses({});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("network-error");
  });
});

describe("RosterRepository — getClassRoster/getSearchPool (permanently mock-first)", () => {
  // US-E18.5: EnrollmentResponse carries no display fields; the DI factory
  // always delegates these two methods to the mock repo. The real stubs are
  // never invoked and never touch HTTP.
  it("getClassRoster returns the dead-code stub without any HTTP call", async () => {
    const http = makeHttp();
    const res = await new RosterRepository(http).getClassRoster("cls-10a1");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("unknown");
    expect(http.get).not.toHaveBeenCalled();
  });

  it("getSearchPool returns the dead-code stub without any HTTP call", async () => {
    const http = makeHttp();
    const res = await new RosterRepository(http).getSearchPool("cls-10a1");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("unknown");
    expect(http.get).not.toHaveBeenCalled();
  });
});

describe("RosterRepository — enroll/unenroll/transfer (US-E06.7)", () => {
  it("enrollStudent sends studentMemberId to the class students path (TR-031)", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const repo = new RosterRepository(makeHttp({ post }));
    const res = await repo.enrollStudent("cls-10a1", "HS25201");
    expect(res.ok).toBe(true);
    expect(post).toHaveBeenCalledWith(
      "/core/api/v1/classes/cls-10a1/students",
      { studentMemberId: "HS25201" },
    );
  });

  it("enrollStudent: ROSTER_STUDENT_ALREADY_ENROLLED → already-enrolled (TR-032 transfer-warning signal)", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(apiError("ROSTER_STUDENT_ALREADY_ENROLLED", 409));
    const repo = new RosterRepository(makeHttp({ post }));
    const res = await repo.enrollStudent("cls-10a1", "HS25202");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("already-enrolled");
  });

  it("enrollStudent: CLASS_ARCHIVED → class-archived (TR-034)", async () => {
    const post = vi.fn().mockRejectedValue(apiError("CLASS_ARCHIVED", 409));
    const repo = new RosterRepository(makeHttp({ post }));
    const res = await repo.enrollStudent("cls-archived", "HS25201");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("class-archived");
  });

  it("enrollStudent: ROSTER_MEMBER_NOT_STUDENT_ROLE → member-not-student (TR-034)", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(apiError("ROSTER_MEMBER_NOT_STUDENT_ROLE", 422));
    const repo = new RosterRepository(makeHttp({ post }));
    const res = await repo.enrollStudent("cls-10a1", "USR-teacher");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("member-not-student");
  });

  it("unenrollStudent: ROSTER_STUDENT_NOT_ENROLLED (404) → silent success (TR-034 idempotent)", async () => {
    const del = vi
      .fn()
      .mockRejectedValue(apiError("ROSTER_STUDENT_NOT_ENROLLED", 404));
    const repo = new RosterRepository(makeHttp({ delete: del }));
    const res = await repo.unenrollStudent("cls-10a1", "HS-gone");
    expect(res.ok).toBe(true);
  });

  it("transferStudent performs DELETE then POST — two-step pattern (TR-032)", async () => {
    const deleteCall = vi.fn().mockResolvedValue(undefined);
    const postCall = vi.fn().mockResolvedValue(undefined);
    const repo = new RosterRepository(
      makeHttp({ delete: deleteCall, post: postCall }),
    );
    const res = await repo.transferStudent("HS25202", "cls-10a2", "cls-10a1");
    expect(res.ok).toBe(true);
    expect(deleteCall).toHaveBeenCalledWith(
      "/core/api/v1/classes/cls-10a2/students/HS25202",
    );
    expect(postCall).toHaveBeenCalledWith(
      "/core/api/v1/classes/cls-10a1/students",
      { studentMemberId: "HS25202" },
    );
  });

  it("transferStudent: source ROSTER_STUDENT_NOT_ENROLLED → continues to enroll in target", async () => {
    const deleteCall = vi
      .fn()
      .mockRejectedValue(apiError("ROSTER_STUDENT_NOT_ENROLLED", 404));
    const postCall = vi.fn().mockResolvedValue(undefined);
    const repo = new RosterRepository(
      makeHttp({ delete: deleteCall, post: postCall }),
    );
    const res = await repo.transferStudent("HS25202", "cls-10a2", "cls-10a1");
    expect(res.ok).toBe(true);
    expect(postCall).toHaveBeenCalledWith(
      "/core/api/v1/classes/cls-10a1/students",
      { studentMemberId: "HS25202" },
    );
  });
});

/**
 * Regression guard for `{ raw: true }` config placement (US-E18.19 sweep). The
 * suites above mock `http.get` to return an envelope directly, so they cannot
 * catch `raw` being nested inside `params` (isRawCall reads `config.raw` at the
 * TOP level). Here `http.get` runs the REAL `unwrapResponse` interceptor against
 * the config `getClasses` actually passes: if `raw` sits inside `params`,
 * isRawCall returns false → the envelope is unwrapped to its array →
 * `parseEnvelope(array)` throws UNKNOWN_ERROR → the call fails. Passes only when
 * `raw` sits at the top level (sibling of `params`).
 */
describe("RosterRepository — real interceptor pipeline (raw-flag placement)", () => {
  function interceptedGet(bodyFor: (url: string) => unknown) {
    return vi.fn(
      async (url: string, config?: { params?: unknown; raw?: boolean }) =>
        unwrapResponse({
          data: bodyFor(url),
          config: { url, raw: config?.raw },
        }),
    ) as unknown as AxiosInstance["get"];
  }

  it("getClasses survives the real unwrap (raw top-level, academicYear kept in params)", async () => {
    const get = interceptedGet((url) => {
      if (url === CLASSES_URL) {
        return makeListEnvelope([
          {
            classId: "cls-10a1",
            name: "10A1",
            gradeLevel: 10,
            academicYearLabel: "2025–2026",
          },
        ]);
      }
      // homeroom-teacher: NOT a raw call → success envelope, unwrapped to dto
      return {
        success: true,
        data: homeroom("cls-10a1", "teacher-uuid-1"),
        error: null,
        meta: { requestId: "req-test" },
      };
    });
    const res = await new RosterRepository(makeHttp({ get })).getClasses({
      academicYear: "2025-2026",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data[0].id).toBe("cls-10a1");
      expect(res.data[0].homeroomTeacher).toBe("teacher-uuid-1");
    }
  });
});
