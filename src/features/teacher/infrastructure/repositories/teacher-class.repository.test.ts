/**
 * Integration tests — TeacherClassRepository (US-E13.1 / raw-flag sweep US-E18.19).
 * The http interceptor unwraps the envelope only when `config.raw` is truthy at
 * the TOP level of the axios config; this repo passes
 * `{ params: { limit: 100 }, raw: true }` so the interceptor leaves the envelope
 * intact and the repo calls `parseEnvelope()` itself. We therefore mock
 * `http.get` to resolve the full ApiEnvelope<T> shape (what `parseEnvelope`
 * consumes). Errors arrive as a normalised ApiError and map through
 * `toTeacherClassFailure`. The "real interceptor pipeline" suite locks the raw
 * flag at config top-level (a nested `params.raw` silently breaks every call).
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError, unwrapResponse } from "@/bootstrap/lib/api-envelope";
import { TeacherClassRepository } from "./teacher-class.repository";

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function makeHttp(get: ReturnType<typeof vi.fn>) {
  return { get } as unknown as AxiosInstance;
}

/** Build a list envelope page; `nextCursor` non-null → more pages follow. */
function listEnvelope<T>(items: T[], nextCursor: string | null = null) {
  return {
    success: true,
    data: items,
    error: null,
    meta: {
      requestId: "req-test",
      pagination: { nextCursor, hasMore: nextCursor != null },
    },
  };
}

function classDto(over: Record<string, unknown> = {}) {
  return {
    classId: "cls-10a1",
    tenantId: "t1",
    name: "10A1",
    gradeLevel: 10,
    academicYearLabel: "2025–2026",
    status: "active",
    // Wire-enriched since BE US-173 — the TEACHER branch of
    // `ListClassesUseCase` runs the same `enrichClassRows` as the admin branch.
    studentCount: 2,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
    ...over,
  };
}

function enrollmentDto(over: Record<string, unknown> = {}) {
  return {
    enrollmentId: "enr-1",
    classId: "cls-10a1",
    studentMemberId: "HS25001",
    displayName: "Nguyễn Văn A",
    academicYearLabel: "2025–2026",
    enrolledAt: "2025-01-01",
    status: "active",
    ...over,
  };
}

describe("TeacherClassRepository (US-E13.1)", () => {
  // ── listMyClasses maps DTOs + derives isHomeroom from currentUserId ───────
  it("listMyClasses maps DTOs to TeacherClass[] with correct isHomeroom", async () => {
    const get = vi.fn().mockResolvedValue(
      listEnvelope([
        classDto({
          classId: "cls-a",
          homeroomTeacherId: "USR-me",
          studentCount: 2,
        }),
        classDto({
          classId: "cls-b",
          homeroomTeacherId: "USR-other",
          studentCount: 5,
        }),
      ]),
    );
    const repo = new TeacherClassRepository(makeHttp(get), "USR-me");
    const res = await repo.listMyClasses();

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(2);
      expect(res.data[0].id).toBe("cls-a");
      expect(res.data[0].isHomeroom).toBe(true);
      expect(res.data[0].studentCount).toBe(2);
      expect(res.data[1].isHomeroom).toBe(false);
      expect(res.data[1].studentCount).toBe(5);
    }
  });

  /**
   * US-E18.30: `studentCount` arrives on the class list itself (BE US-173), so
   * the old "drain every class's roster to count it" 1+N fan-out is gone. Assert
   * the CALL COUNT — a result-only assertion would still pass with the fan-out
   * present.
   */
  it("listMyClasses issues EXACTLY ONE HTTP call for a 3-class page (no 1+N roster fan-out)", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        listEnvelope([
          classDto({ classId: "cls-a" }),
          classDto({ classId: "cls-b" }),
          classDto({ classId: "cls-c" }),
        ]),
      );
    const repo = new TeacherClassRepository(makeHttp(get), null);
    const res = await repo.listMyClasses();

    expect(res.ok).toBe(true);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/core/api/v1/classes", {
      params: { limit: 100 },
      raw: true,
    });
  });

  // ── listMyClasses drains 2-page cursor pagination ────────────────────────
  it("listMyClasses drains a 2-page cursor for the class list", async () => {
    // Page the class list: first call returns cursor, second returns last page.
    let classCall = 0;
    const get = vi.fn();
    get.mockImplementation((url: string) => {
      if (url === "/core/api/v1/classes") {
        classCall += 1;
        return classCall === 1
          ? Promise.resolve(
              listEnvelope([classDto({ classId: "cls-a" })], "C2"),
            )
          : Promise.resolve(
              listEnvelope([classDto({ classId: "cls-b" })], null),
            );
      }
      return Promise.resolve(listEnvelope([enrollmentDto()]));
    });

    const repo = new TeacherClassRepository(makeHttp(get), null);
    const res = await repo.listMyClasses();

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.map((c) => c.id)).toEqual(["cls-a", "cls-b"]);
    }
    // The class endpoint was called twice (page 1 + page 2 via cursor).
    const classListCalls = get.mock.calls.filter(
      (c) => c[0] === "/core/api/v1/classes",
    );
    expect(classListCalls).toHaveLength(2);
    expect(classListCalls[1][1]).toEqual({
      params: { limit: 100, cursor: "C2" },
      raw: true,
    });
  });

  // ── listMyClasses maps errors via toTeacherClassFailure ──────────────────
  it("listMyClasses: 401 → unauthorized", async () => {
    const get = vi.fn().mockRejectedValue(apiError("UNAUTHORIZED", 401));
    const repo = new TeacherClassRepository(makeHttp(get), null);
    const res = await repo.listMyClasses();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("unauthorized");
  });

  // ── getClassStudents returns mapped TeacherRosterStudent[] ────────────────
  it("getClassStudents returns mapped TeacherRosterStudent[]", async () => {
    const get = vi.fn().mockResolvedValue(
      listEnvelope([
        enrollmentDto({
          enrollmentId: "enr-1",
          studentMemberId: "HS25001",
          displayName: "Nguyễn Văn A",
          status: "active",
        }),
        enrollmentDto({
          enrollmentId: "enr-2",
          studentMemberId: "HS25002",
          displayName: "  ",
          status: "transferred",
        }),
      ]),
    );
    const repo = new TeacherClassRepository(makeHttp(get), null);
    const res = await repo.getClassStudents("cls-10a1");

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(2);
      expect(res.data[0].displayName).toBe("Nguyễn Văn A");
      expect(res.data[0].status).toBe("active");
      // blank displayName falls back to the member id
      expect(res.data[1].displayName).toBe("HS25002");
      expect(res.data[1].status).toBe("transferred");
    }
    expect(get).toHaveBeenCalledWith("/core/api/v1/classes/cls-10a1/students", {
      params: { limit: 100 },
      raw: true,
    });
  });

  // ── getClassStudents decorates missing names from the IAM directory ──────
  it("getClassStudents fills blank displayNames from the injected resolver", async () => {
    const get = vi.fn().mockResolvedValue(
      listEnvelope([
        enrollmentDto({
          enrollmentId: "enr-1",
          studentMemberId: "HS25001",
          displayName: "",
          status: "active",
        }),
      ]),
    );
    const resolveNames = vi
      .fn()
      .mockResolvedValue(new Map([["HS25001", "Nguyễn Văn A"]]));
    const repo = new TeacherClassRepository(makeHttp(get), null, resolveNames);

    const res = await repo.getClassStudents("cls-10a1");

    expect(resolveNames).toHaveBeenCalledWith(["HS25001"]);
    expect(res.ok && res.data[0].displayName).toBe("Nguyễn Văn A");
  });

  it("getClassStudents keeps the id fallback when the resolver finds nothing", async () => {
    const get = vi.fn().mockResolvedValue(
      listEnvelope([
        enrollmentDto({
          enrollmentId: "enr-1",
          studentMemberId: "HS25002",
          displayName: "",
        }),
      ]),
    );
    const repo = new TeacherClassRepository(
      makeHttp(get),
      null,
      async () => new Map<string, string>(),
    );

    const res = await repo.getClassStudents("cls-10a1");

    expect(res.ok && res.data[0].displayName).toBe("HS25002");
  });

  // ── getClassStudents handles empty result ────────────────────────────────
  it("getClassStudents returns an empty array for an empty class", async () => {
    const get = vi.fn().mockResolvedValue(listEnvelope([]));
    const repo = new TeacherClassRepository(makeHttp(get), null);
    const res = await repo.getClassStudents("cls-empty");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual([]);
  });

  // ── getClassStudents maps CLASS_NOT_FOUND → not-found ─────────────────────
  it("getClassStudents: CLASS_NOT_FOUND → not-found", async () => {
    const get = vi.fn().mockRejectedValue(apiError("CLASS_NOT_FOUND", 404));
    const repo = new TeacherClassRepository(makeHttp(get), null);
    const res = await repo.getClassStudents("missing");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("not-found");
  });
});

/**
 * US-E24.7 — role/subject decoration + the GVCN KPI slice.
 *
 * `teachingSubjectIds` (BE US-234) is id-only, so the repository drains the
 * subject catalogue ONCE per list call (never per class) and only when at least
 * one row actually carries subject ids. The GVCN KPI slice fans out over three
 * INDEPENDENT sources and degrades per-field: one rejected sub-call must never
 * fail the card.
 */
describe("TeacherClassRepository — roles/subjects + homeroom KPI (US-E24.7)", () => {
  const SUBJECTS_URL = "/core/api/v1/subjects";
  const VIOLATIONS_URL = "/core/api/v1/conduct/student-violations";
  const LEAVE_URL = "/core/api/v1/conduct/student-leave-requests";

  function subjectDto(subjectId: string, name: string) {
    return {
      subjectId,
      tenantId: "t1",
      name,
      gradeLevel: 10,
      status: "ACTIVE",
    };
  }

  it("decorates teachingSubjectIds with catalogue names in ONE extra call", async () => {
    const get = vi.fn((url: string) =>
      url === SUBJECTS_URL
        ? Promise.resolve(
            listEnvelope([
              subjectDto("sub-math", "Toán"),
              subjectDto("sub-physics", "Vật lý"),
            ]),
          )
        : Promise.resolve(
            listEnvelope([
              classDto({
                classId: "cls-10a1",
                homeroomTeacherId: "MEMBER-me",
                teachingSubjectIds: ["sub-math"],
              }),
              classDto({
                classId: "cls-11b2",
                teachingSubjectIds: ["sub-math", "sub-physics"],
              }),
            ]),
          ),
    );

    const repo = new TeacherClassRepository(makeHttp(get), "MEMBER-me");
    const res = await repo.listMyClasses();

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data[0].roles).toEqual(["homeroom", "subject"]);
      expect(res.data[0].subjects).toEqual([{ id: "sub-math", name: "Toán" }]);
      expect(res.data[1].roles).toEqual(["subject"]);
      expect(res.data[1].subjects.map((s) => s.name)).toEqual([
        "Toán",
        "Vật lý",
      ]);
    }
    // classes page + ONE catalogue drain — never one lookup per class.
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenCalledWith(SUBJECTS_URL, {
      params: { limit: 100 },
      raw: true,
    });
  });

  it("skips the catalogue call entirely for a homeroom-only teacher", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        listEnvelope([classDto({ homeroomTeacherId: "MEMBER-me" })]),
      );
    const repo = new TeacherClassRepository(makeHttp(get), "MEMBER-me");
    const res = await repo.listMyClasses();

    expect(res.ok && res.data[0].roles).toEqual(["homeroom"]);
    expect(res.ok && res.data[0].subjects).toEqual([]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("degrades to the raw subject id when the catalogue call fails", async () => {
    const get = vi.fn((url: string) =>
      url === SUBJECTS_URL
        ? Promise.reject(apiError("INTERNAL_ERROR", 500))
        : Promise.resolve(
            listEnvelope([classDto({ teachingSubjectIds: ["sub-math"] })]),
          ),
    );
    const repo = new TeacherClassRepository(makeHttp(get), null);
    const res = await repo.listMyClasses();

    expect(res.ok).toBe(true);
    if (res.ok)
      expect(res.data[0].subjects).toEqual([
        { id: "sub-math", name: "sub-math" },
      ]);
  });

  it("getHomeroomKpi counts SUBMITTED violations + the GVCN leave inbox", async () => {
    const get = vi.fn((url: string) => {
      if (url === VIOLATIONS_URL)
        return Promise.resolve(
          listEnvelope([
            { state: "SUBMITTED" },
            { state: "APPROVED" },
            { state: "SUBMITTED" },
          ]),
        );
      if (url === LEAVE_URL)
        return Promise.resolve(
          listEnvelope([
            { requestId: "lr-1", state: "SUBMITTED" },
            { requestId: "lr-2", state: "SUBMITTED" },
          ]),
        );
      return Promise.reject(new Error(`unexpected call ${url}`));
    });

    const repo = new TeacherClassRepository(makeHttp(get), "MEMBER-me");
    const res = await repo.getHomeroomKpi("cls-10a1");

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.openViolations).toBe(2);
      expect(res.data.pendingLeave).toBe(2);
      // draft US-245 has no term source on the web yet → never a live call.
      expect(res.data.attendanceRate).toBeUndefined();
      expect(res.data.demoFields).toEqual([]);
    }
    expect(get).toHaveBeenCalledWith(VIOLATIONS_URL, {
      params: { limit: 100, classId: "cls-10a1" },
      raw: true,
    });
    expect(get).toHaveBeenCalledWith(LEAVE_URL, {
      params: { limit: 100, classId: "cls-10a1" },
      raw: true,
    });
    // No attendance-summary round trip is attempted.
    expect(
      get.mock.calls.some((c) => String(c[0]).includes("attendance/summary")),
    ).toBe(false);
  });

  it("getHomeroomKpi keeps the surviving field when one sub-call 500s", async () => {
    const get = vi.fn((url: string) =>
      url === VIOLATIONS_URL
        ? Promise.reject(apiError("INTERNAL_ERROR", 500))
        : Promise.resolve(
            listEnvelope([{ requestId: "lr-1", state: "SUBMITTED" }]),
          ),
    );

    const repo = new TeacherClassRepository(makeHttp(get), "MEMBER-me");
    const res = await repo.getHomeroomKpi("cls-10a1");

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.openViolations).toBeUndefined();
      expect(res.data.pendingLeave).toBe(1);
    }
  });

  it("getHomeroomKpi degrades to an empty KPI when every source fails", async () => {
    const get = vi.fn().mockRejectedValue(apiError("VIOLATION_FORBIDDEN", 403));
    const res = await new TeacherClassRepository(
      makeHttp(get),
      "MEMBER-me",
    ).getHomeroomKpi("cls-10a1");

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.openViolations).toBeUndefined();
      expect(res.data.pendingLeave).toBeUndefined();
      expect(res.data.attendanceRate).toBeUndefined();
    }
  });
});

/**
 * Regression guard for `{ raw: true }` config placement in `fetchAllPages`. The
 * suites above mock `http.get` to return an envelope directly, so they cannot
 * catch `raw` being nested inside `params` (isRawCall reads `config.raw` at the
 * TOP level). Here `http.get` runs the REAL `unwrapResponse` interceptor against
 * the config the repo actually passes: if `raw` sits inside `params`, isRawCall
 * returns false → the envelope is unwrapped to its array → the repo's
 * `parseEnvelope(array)` throws UNKNOWN_ERROR → the call fails. Passes only when
 * `raw` sits at the top level of the config (sibling of `params`).
 */
describe("TeacherClassRepository — real interceptor pipeline (raw-flag placement)", () => {
  function interceptedGet(bodyFor: (url: string) => unknown) {
    return vi.fn(
      async (url: string, config?: { params?: unknown; raw?: boolean }) =>
        unwrapResponse({
          data: bodyFor(url),
          config: { url, raw: config?.raw },
        }),
    );
  }

  it("listMyClasses survives the real unwrap (raw top-level, limit kept in params)", async () => {
    const get = interceptedGet(() =>
      listEnvelope([classDto({ classId: "cls-a", studentCount: 1 })]),
    );
    const res = await new TeacherClassRepository(
      makeHttp(get),
      null,
    ).listMyClasses();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data[0].id).toBe("cls-a");
      expect(res.data[0].studentCount).toBe(1);
    }
  });

  it("getClassStudents survives the real unwrap (raw top-level)", async () => {
    const get = interceptedGet(() => listEnvelope([enrollmentDto()]));
    const res = await new TeacherClassRepository(
      makeHttp(get),
      null,
    ).getClassStudents("cls-10a1");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toHaveLength(1);
  });
});
