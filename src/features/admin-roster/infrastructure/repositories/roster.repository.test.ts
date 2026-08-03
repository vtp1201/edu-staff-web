/**
 * Integration tests — RosterRepository error-code mapping, the enriched
 * homeroom fields, and two-step transfer (US-E06.7 + US-E18.5 real-wire remap +
 * US-E18.30 un-fan-out).
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

const CLASSES_URL = "/core/api/v1/classes";

/** Wire `ClassResponse` row (enriched since BE US-173). */
function classDto(over: Record<string, unknown> = {}) {
  return {
    classId: "cls-10a1",
    name: "10A1",
    gradeLevel: 10,
    academicYearLabel: "2025–2026",
    homeroomTeacherId: null,
    homeroomTeacherName: null,
    ...over,
  };
}

describe("RosterRepository — getClasses (US-E18.5 real wire, US-E18.30 enriched)", () => {
  it("maps the wire envelope in ONE call — the per-row homeroom fan-out is gone", async () => {
    // Before US-E18.30 this fired `GET /classes/{id}/homeroom-teacher` per row
    // (and displayed the RAW member uuid as the teacher's name). BE US-173 put
    // homeroomTeacherId/Name on the list row: exactly one HTTP call now.
    const get = vi.fn(async () =>
      makeListEnvelope([
        classDto({
          homeroomTeacherId: "teacher-uuid-1",
          homeroomTeacherName: "Nguyễn Thị Hương",
        }),
        classDto({ classId: "cls-10b3", name: "10B3" }),
      ]),
    ) as unknown as AxiosInstance["get"];
    const repo = new RosterRepository(makeHttp({ get }));
    const res = await repo.getClasses({});
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(2);
      expect(res.data[0]).toEqual({
        id: "cls-10a1",
        name: "10A1",
        gradeLevel: 10,
        // real display NAME, no longer a raw uuid
        homeroomTeacher: "Nguyễn Thị Hương",
        year: "2025–2026",
      });
      // homeroomTeacherId null → genuinely no homeroom assigned
      expect(res.data[1].homeroomTeacher).toBeNull();
    }
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("keeps the class assigned (raw id fallback) when only the NAME lookup degraded", async () => {
    const get = vi.fn(async () =>
      makeListEnvelope([
        classDto({
          homeroomTeacherId: "teacher-uuid-1",
          homeroomTeacherName: null,
        }),
      ]),
    ) as unknown as AxiosInstance["get"];
    const res = await new RosterRepository(makeHttp({ get })).getClasses({});
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data[0].homeroomTeacher).toBe("teacher-uuid-1");
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

describe("RosterRepository — getSearchPool (still permanently mock-first)", () => {
  // US-E18.35 un-mocked getClassRoster but NOT this: the gap here is a MISSING
  // ENDPOINT (no core query for unassigned/transfer-candidate students), which
  // IAM US-169's dob/gender addition does nothing about. The DI factory still
  // delegates this one method to the mock repo, so the stub stays dead code.
  it("getSearchPool returns the dead-code stub without any HTTP call", async () => {
    const http = makeHttp();
    const res = await new RosterRepository(http).getSearchPool("cls-10a1");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("unknown");
    expect(http.get).not.toHaveBeenCalled();
  });
});

const ROSTER_URL = "/core/api/v1/classes/cls-10a1/students";

/** Wire `EnrollmentResponse` row. */
function enrollmentDto(over: Record<string, unknown> = {}) {
  return {
    enrollmentId: "enr-1",
    classId: "cls-10a1",
    studentMemberId: "stu-1",
    academicYearLabel: "2025–2026",
    enrolledAt: "2025-09-05T02:00:00Z",
    ...over,
  };
}

describe("RosterRepository — getClassRoster (US-E18.35 real two-source composition)", () => {
  it("composes core enrollments with ONE batched IAM detail lookup — never N+1", async () => {
    // core = AUTHORITY for WHICH students are enrolled; IAM = DECORATION for
    // the ids core returned. The security-relevant assertion is the exact id
    // list handed to the lookup: it is never an existence oracle.
    const get = vi.fn(async () =>
      makeListEnvelope([
        enrollmentDto(),
        enrollmentDto({ enrollmentId: "enr-2", studentMemberId: "stu-2" }),
        enrollmentDto({ enrollmentId: "enr-3", studentMemberId: "stu-3" }),
      ]),
    ) as unknown as AxiosInstance["get"];
    const resolveDetails = vi.fn(
      async () =>
        new Map([
          [
            "stu-1",
            {
              name: "Nguyễn Minh Anh",
              dob: "2010-03-15T00:00:00Z",
              gender: "FEMALE" as const,
            },
          ],
          ["stu-2", { name: "Trần Văn Bình", gender: "MALE" as const }],
        ]),
    );
    const repo = new RosterRepository(makeHttp({ get }), resolveDetails);

    const res = await repo.getClassRoster("cls-10a1");

    expect(get).toHaveBeenCalledTimes(1);
    expect(resolveDetails).toHaveBeenCalledTimes(1);
    expect(resolveDetails).toHaveBeenCalledWith(["stu-1", "stu-2", "stu-3"]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toEqual([
      {
        id: "stu-1",
        name: "Nguyễn Minh Anh",
        dob: "15/03/2010",
        gender: "F",
        status: "active",
      },
      // dob unset for this member (ADR-0122) → key absent, no placeholder text
      // baked in at the infrastructure layer.
      { id: "stu-2", name: "Trần Văn Bình", gender: "M", status: "active" },
      // unresolvable id → decorated with nothing at all, but still enrolled.
      { id: "stu-3", status: "active" },
    ]);
  });

  it("every row is active — the endpoint returns only current enrollments (hard-delete on unenroll)", async () => {
    const get = vi.fn(async () =>
      makeListEnvelope([
        enrollmentDto(),
        enrollmentDto({ studentMemberId: "stu-2" }),
      ]),
    ) as unknown as AxiosInstance["get"];
    const res = await new RosterRepository(makeHttp({ get })).getClassRoster(
      "cls-10a1",
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.every((s) => s.status === "active")).toBe(true);
  });

  it("follows the cursor so a class larger than one page is not silently truncated", async () => {
    const get = vi.fn(
      async (_url: string, config?: { params?: { cursor?: string } }) =>
        config?.params?.cursor === "c1"
          ? makeListEnvelope([enrollmentDto({ studentMemberId: "stu-2" })])
          : {
              ...makeListEnvelope([enrollmentDto()]),
              meta: {
                requestId: "req-test",
                pagination: { nextCursor: "c1", hasMore: true },
              },
            },
    ) as unknown as AxiosInstance["get"];
    const repo = new RosterRepository(makeHttp({ get }));

    const res = await repo.getClassRoster("cls-10a1");

    expect(get).toHaveBeenCalledTimes(2);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.map((s) => s.id)).toEqual(["stu-1", "stu-2"]);
  });

  it("sends raw:true at the TOP level (sibling of params) so the envelope reaches parseEnvelope", async () => {
    const get = vi.fn(async () =>
      makeListEnvelope([]),
    ) as unknown as AxiosInstance["get"];
    await new RosterRepository(makeHttp({ get })).getClassRoster("cls-10a1");
    expect(get).toHaveBeenCalledWith(
      ROSTER_URL,
      expect.objectContaining({ raw: true }),
    );
  });

  it("skips the IAM call entirely for an empty class", async () => {
    const get = vi.fn(async () =>
      makeListEnvelope([]),
    ) as unknown as AxiosInstance["get"];
    const resolveDetails = vi.fn(async () => new Map());
    const res = await new RosterRepository(
      makeHttp({ get }),
      resolveDetails,
    ).getClassRoster("cls-10a1");

    expect(resolveDetails).not.toHaveBeenCalled();
    expect(res).toEqual({ ok: true, data: [] });
  });

  it("degrades (never fails) when the IAM decoration throws — the roster still renders", async () => {
    const get = vi.fn(async () =>
      makeListEnvelope([enrollmentDto()]),
    ) as unknown as AxiosInstance["get"];
    const resolveDetails = vi.fn(async () => {
      throw new Error("iam down");
    });
    const res = await new RosterRepository(
      makeHttp({ get }),
      resolveDetails,
    ).getClassRoster("cls-10a1");

    expect(res).toEqual({
      ok: true,
      data: [{ id: "stu-1", status: "active" }],
    });
  });

  it("ROSTER_ACCESS_FORBIDDEN (403) → forbidden — the AUTHORITY read is not best-effort", async () => {
    const get = vi
      .fn()
      .mockRejectedValue(apiError("ROSTER_ACCESS_FORBIDDEN", 403));
    const res = await new RosterRepository(makeHttp({ get })).getClassRoster(
      "cls-10a1",
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("forbidden");
  });

  it("CLASS_NOT_FOUND (404) → not-found", async () => {
    const get = vi.fn().mockRejectedValue(apiError("CLASS_NOT_FOUND", 404));
    const res = await new RosterRepository(makeHttp({ get })).getClassRoster(
      "cls-gone",
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("not-found");
  });

  it("transport failure → network-error", async () => {
    const get = vi.fn().mockRejectedValue(new Error("boom"));
    const res = await new RosterRepository(makeHttp({ get })).getClassRoster(
      "cls-10a1",
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("network-error");
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
    const get = interceptedGet(() =>
      makeListEnvelope([
        classDto({
          homeroomTeacherId: "teacher-uuid-1",
          homeroomTeacherName: "Nguyễn Thị Hương",
        }),
      ]),
    );
    const res = await new RosterRepository(makeHttp({ get })).getClasses({
      academicYear: "2025-2026",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data[0].id).toBe("cls-10a1");
      expect(res.data[0].homeroomTeacher).toBe("Nguyễn Thị Hương");
    }
  });

  it("getClassRoster survives the real unwrap (US-E18.35 — new cursor-paginated caller)", async () => {
    const get = interceptedGet(() => makeListEnvelope([enrollmentDto()]));
    const res = await new RosterRepository(makeHttp({ get })).getClassRoster(
      "cls-10a1",
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual([{ id: "stu-1", status: "active" }]);
  });
});
