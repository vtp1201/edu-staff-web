/**
 * Integration tests — TeacherDashboardRepository (US-E13.4 / raw-flag sweep
 * US-E18.19). `getTotalStudents` / `getTotalClasses` drain cursor-paginated
 * `core` list endpoints via `fetchAllPages`, which passes `{ raw: true }` at the
 * TOP level of the axios config so the interceptor leaves the envelope intact
 * and the repo calls `parseEnvelope()` itself. The mocked-envelope suite asserts
 * counting/paging; the "real interceptor pipeline" suite locks the raw flag at
 * config top-level (a nested `params.raw` silently breaks every call).
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError, unwrapResponse } from "@/bootstrap/lib/api-envelope";
import { TeacherDashboardRepository } from "./teacher-dashboard.repository";

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return {
    get: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
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
    homeroomTeacherId: null,
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

describe("TeacherDashboardRepository — counts", () => {
  it("getTotalClasses returns the paginated class-list length", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        listEnvelope([
          classDto({ classId: "cls-a" }),
          classDto({ classId: "cls-b" }),
        ]),
      );
    const repo = new TeacherDashboardRepository(makeHttp({ get }));
    const res = await repo.getTotalClasses();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBe(2);
  });

  it("getTotalStudents sums each class roster length", async () => {
    const get = vi
      .fn()
      .mockImplementation((url: string) =>
        url === "/core/api/v1/classes"
          ? Promise.resolve(
              listEnvelope([
                classDto({ classId: "cls-a" }),
                classDto({ classId: "cls-b" }),
              ]),
            )
          : Promise.resolve(listEnvelope([enrollmentDto(), enrollmentDto()])),
      );
    const repo = new TeacherDashboardRepository(makeHttp({ get }));
    const res = await repo.getTotalStudents();
    expect(res.ok).toBe(true);
    // 2 classes × 2 students each = 4
    if (res.ok) expect(res.data).toBe(4);
  });

  it("getTotalClasses maps 401 → unauthorized failure", async () => {
    const get = vi.fn().mockRejectedValue(apiError("UNAUTHORIZED", 401));
    const repo = new TeacherDashboardRepository(makeHttp({ get }));
    const res = await repo.getTotalClasses();
    expect(res.ok).toBe(false);
  });
});

/**
 * Regression guard for `{ raw: true }` config placement in `fetchAllPages`. The
 * suite above mocks `http.get` to return an envelope directly, so it cannot
 * catch `raw` being nested inside `params` (isRawCall reads `config.raw` at the
 * TOP level). Here `http.get` runs the REAL `unwrapResponse` interceptor against
 * the config the repo actually passes: if `raw` sits inside `params`, isRawCall
 * returns false → the envelope is unwrapped to its array → the repo's
 * `parseEnvelope(array)` throws UNKNOWN_ERROR → the call fails. Passes only when
 * `raw` sits at the top level of the config (sibling of `params`).
 */
describe("TeacherDashboardRepository — real interceptor pipeline (raw-flag placement)", () => {
  function interceptedGet(bodyFor: (url: string) => unknown) {
    return vi.fn(
      async (url: string, config?: { params?: unknown; raw?: boolean }) =>
        unwrapResponse({
          data: bodyFor(url),
          config: { url, raw: config?.raw },
        }),
    ) as unknown as AxiosInstance["get"];
  }

  it("getTotalClasses survives the real unwrap (raw top-level, limit kept in params)", async () => {
    const get = interceptedGet(() => listEnvelope([classDto()]));
    const repo = new TeacherDashboardRepository(makeHttp({ get }));
    const res = await repo.getTotalClasses();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBe(1);
  });

  it("getTotalStudents survives the real unwrap (raw top-level)", async () => {
    const get = interceptedGet((url) =>
      url === "/core/api/v1/classes"
        ? listEnvelope([classDto()])
        : listEnvelope([enrollmentDto(), enrollmentDto()]),
    );
    const repo = new TeacherDashboardRepository(makeHttp({ get }));
    const res = await repo.getTotalStudents();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBe(2);
  });
});
