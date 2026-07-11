/**
 * Integration tests — RosterRepository error-code mapping + two-step transfer
 * pattern (TR-031..TR-036, US-E06.7).
 * The http interceptor unwraps the envelope; repositories receive the payload
 * directly and receive a normalised ApiError on failure. Mock at that boundary.
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

describe("RosterRepository (US-E06.7)", () => {
  // ── getClasses (paginated) ───────────────────────────────────────────────
  it("getClasses maps the paginated envelope to ClassSummary[]", async () => {
    const http = makeHttp({
      get: vi.fn().mockResolvedValue(
        makeListEnvelope([
          {
            id: "cls-10a1",
            name: "10A1",
            gradeLevel: 10,
            homeroomTeacher: "Nguyễn Thị Hương",
            year: "2025–2026",
          },
        ]),
      ),
    });
    const repo = new RosterRepository(http);
    const res = await repo.getClasses({});
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(1);
      expect(res.data[0].id).toBe("cls-10a1");
    }
  });

  // ── getClasses — passes academicYear param ───────────────────────────────
  it("getClasses passes academicYear to the API (TR-031)", async () => {
    const get = vi.fn().mockResolvedValue(makeListEnvelope([]));
    const repo = new RosterRepository(makeHttp({ get }));
    await repo.getClasses({ academicYear: "2025-2026" });
    expect(get).toHaveBeenCalledWith(
      "/core/api/v1/classes",
      expect.objectContaining({
        params: expect.objectContaining({ academicYear: "2025-2026" }),
      }),
    );
  });

  // ── getClassRoster (paginated) ───────────────────────────────────────────
  it("getClassRoster maps the paginated envelope to RosterStudent[]", async () => {
    const http = makeHttp({
      get: vi.fn().mockResolvedValue(
        makeListEnvelope([
          {
            id: "HS25001",
            name: "A",
            dob: "01/01/2010",
            gender: "F",
            status: "active",
          },
        ]),
      ),
    });
    const repo = new RosterRepository(http);
    const res = await repo.getClassRoster("cls-10a1");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data[0].gender).toBe("F");
  });

  // ── CLASS_NOT_FOUND → not-found ──────────────────────────────────────────
  it("getClassRoster: CLASS_NOT_FOUND → not-found", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(apiError("CLASS_NOT_FOUND", 404)),
    });
    const repo = new RosterRepository(http);
    const res = await repo.getClassRoster("missing");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("not-found");
  });

  // ── 401 → unauthorized ───────────────────────────────────────────────────
  it("getClasses: 401 → unauthorized", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(apiError("UNAUTHORIZED", 401)),
    });
    const repo = new RosterRepository(http);
    const res = await repo.getClasses({});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("unauthorized");
  });

  // ── ROSTER_ACCESS_FORBIDDEN → forbidden ─────────────────────────────────
  it("getClassRoster: ROSTER_ACCESS_FORBIDDEN → forbidden (TEACHER scope, TR-035)", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(apiError("ROSTER_ACCESS_FORBIDDEN", 403)),
    });
    const repo = new RosterRepository(http);
    const res = await repo.getClassRoster("cls-restricted");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("forbidden");
  });

  // ── enrollStudent — sends studentMemberId (TR-031) ───────────────────────
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

  // ── enrollStudent — ROSTER_STUDENT_ALREADY_ENROLLED → already-enrolled ───
  it("enrollStudent: ROSTER_STUDENT_ALREADY_ENROLLED → already-enrolled (TR-032 transfer-warning signal)", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(apiError("ROSTER_STUDENT_ALREADY_ENROLLED", 409));
    const repo = new RosterRepository(makeHttp({ post }));
    const res = await repo.enrollStudent("cls-10a1", "HS25202");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("already-enrolled");
  });

  // ── enrollStudent — CLASS_ARCHIVED → class-archived ─────────────────────
  it("enrollStudent: CLASS_ARCHIVED → class-archived (TR-034)", async () => {
    const post = vi.fn().mockRejectedValue(apiError("CLASS_ARCHIVED", 409));
    const repo = new RosterRepository(makeHttp({ post }));
    const res = await repo.enrollStudent("cls-archived", "HS25201");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("class-archived");
  });

  // ── enrollStudent — ROSTER_MEMBER_NOT_STUDENT_ROLE → member-not-student ──
  it("enrollStudent: ROSTER_MEMBER_NOT_STUDENT_ROLE → member-not-student (TR-034)", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(apiError("ROSTER_MEMBER_NOT_STUDENT_ROLE", 422));
    const repo = new RosterRepository(makeHttp({ post }));
    const res = await repo.enrollStudent("cls-10a1", "USR-teacher");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("member-not-student");
  });

  // ── unenrollStudent — ROSTER_STUDENT_NOT_ENROLLED → silent success ───────
  it("unenrollStudent: ROSTER_STUDENT_NOT_ENROLLED (404) → silent success (TR-034 idempotent)", async () => {
    const del = vi
      .fn()
      .mockRejectedValue(apiError("ROSTER_STUDENT_NOT_ENROLLED", 404));
    const repo = new RosterRepository(makeHttp({ delete: del }));
    const res = await repo.unenrollStudent("cls-10a1", "HS-gone");
    // 404 on unenroll = already removed — treat as success
    expect(res.ok).toBe(true);
  });

  // ── transferStudent — two-step pattern (TR-032) ──────────────────────────
  it("transferStudent performs DELETE then POST — two-step pattern (TR-032)", async () => {
    const deleteCall = vi.fn().mockResolvedValue(undefined);
    const postCall = vi.fn().mockResolvedValue(undefined);
    const repo = new RosterRepository(
      makeHttp({ delete: deleteCall, post: postCall }),
    );
    const res = await repo.transferStudent("HS25202", "cls-10a2", "cls-10a1");
    expect(res.ok).toBe(true);
    // Step 1: DELETE from source class
    expect(deleteCall).toHaveBeenCalledWith(
      "/core/api/v1/classes/cls-10a2/students/HS25202",
    );
    // Step 2: POST to target class
    expect(postCall).toHaveBeenCalledWith(
      "/core/api/v1/classes/cls-10a1/students",
      { studentMemberId: "HS25202" },
    );
  });

  // ── transferStudent — source 404 is idempotent (TR-034 + TR-032) ─────────
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
    // Should still proceed to enroll even if unenroll returned 404
    expect(postCall).toHaveBeenCalledWith(
      "/core/api/v1/classes/cls-10a1/students",
      { studentMemberId: "HS25202" },
    );
  });
});

/**
 * Regression guard for `{ raw: true }` config placement. The suite above mocks
 * `http.get` to return an envelope directly, so it cannot catch `raw` being
 * nested inside `params` (isRawCall reads `config.raw` at the TOP level). Here
 * `http.get` runs the REAL `unwrapResponse` interceptor against the config each
 * list method actually passes: if `raw` sits inside `params`, isRawCall returns
 * false → the envelope is unwrapped to its array → the repo's
 * `parseEnvelope(array)` throws UNKNOWN_ERROR → the call fails. Passes only when
 * `raw` sits at the top level of the config (sibling of `params`).
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
        {
          id: "cls-10a1",
          name: "10A1",
          gradeLevel: 10,
          homeroomTeacher: "Nguyễn Thị Hương",
          year: "2025–2026",
        },
      ]),
    );
    const res = await new RosterRepository(makeHttp({ get })).getClasses({
      academicYear: "2025-2026",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data[0].id).toBe("cls-10a1");
  });

  it("getClassRoster survives the real unwrap (raw is top-level)", async () => {
    const get = interceptedGet(() =>
      makeListEnvelope([
        {
          id: "HS25001",
          name: "A",
          dob: "01/01/2010",
          gender: "F",
          status: "active",
        },
      ]),
    );
    const res = await new RosterRepository(makeHttp({ get })).getClassRoster(
      "cls-10a1",
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data[0].gender).toBe("F");
  });
});
