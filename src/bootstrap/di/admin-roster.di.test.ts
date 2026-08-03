/**
 * Unit tests — `makeRosterRepository()` env matrix (US-E18.35).
 *
 * US-E18.5 pinned `getClassRoster` AND `getSearchPool` to the mock repository
 * UNCONDITIONALLY. IAM US-144/US-169 closed the display-field gap, so
 * `getClassRoster` must now behave like every other un-mocked read: mock ONLY
 * when `NEXT_PUBLIC_USE_MOCK === "true"`.
 *
 * The dangerous direction is the flag being `"false"` or UNSET (i.e.
 * production — `USE_MOCK` is false when unset): an admin must NOT be shown a
 * seeded roster of 32 students who are not in the class. `getSearchPool` is the
 * mirror-image regression: its gap (no core endpoint at all) is NOT closed, so
 * it must STILL serve the mock, with zero HTTP, in every env.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
  vi.doUnmock("@/bootstrap/lib/http.server");
  vi.doUnmock("@/bootstrap/di/auth.di");
  vi.doUnmock("@/bootstrap/di/iam-directory.di");
});

/** One page of enrolled students, envelope-shaped (the repo passes raw: true). */
function enrollmentEnvelope() {
  return {
    success: true,
    data: [
      {
        enrollmentId: "enr-1",
        classId: "cls-10a1",
        studentMemberId: "stu-1",
        academicYearLabel: "2025–2026",
        enrolledAt: "2025-09-05T02:00:00Z",
      },
    ],
    error: null,
    meta: {
      requestId: "req-test",
      pagination: { nextCursor: null, hasMore: false },
    },
  };
}

function stubRealDeps(
  get = vi.fn(async () => enrollmentEnvelope()),
  execute = vi.fn(async () => ({
    ok: true as const,
    value: [
      {
        memberId: "stu-1",
        displayName: "Nguyễn Minh Anh",
        dob: "2010-03-15T00:00:00Z",
        gender: "FEMALE" as const,
      },
    ],
  })),
) {
  vi.doMock("@/bootstrap/di/auth.di", () => ({
    ensureFreshSession: vi.fn(async () => {}),
  }));
  vi.doMock("@/bootstrap/lib/http.server", () => ({
    createServerHttpClient: vi.fn(async () => ({
      get,
      post: vi.fn(),
      delete: vi.fn(),
    })),
  }));
  vi.doMock("@/bootstrap/di/iam-directory.di", () => ({
    makeBatchResolveMembersUseCase: vi.fn(async () => ({ execute })),
  }));
  return { get, execute };
}

async function makeWithEnv(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  const { makeRosterRepository } = await import("./admin-roster.di");
  return makeRosterRepository();
}

describe("makeRosterRepository — getClassRoster (un-mocked in US-E18.35)", () => {
  it('serves the seeded mock roster only when NEXT_PUBLIC_USE_MOCK="true"', async () => {
    const createServerHttpClient = vi.fn();
    vi.doMock("@/bootstrap/lib/http.server", () => ({
      createServerHttpClient,
    }));

    const repo = await makeWithEnv("true");
    const result = await repo.getClassRoster("cls-10a1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.length).toBeGreaterThan(0);
    expect(createServerHttpClient).not.toHaveBeenCalled();
  });

  for (const value of [undefined, "false"] as const) {
    it(`composes the REAL core enrollments + IAM detail lookup when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      const { get, execute } = stubRealDeps();

      const repo = await makeWithEnv(value);
      const result = await repo.getClassRoster("cls-10a1");

      expect(get).toHaveBeenCalledTimes(1);
      // Decoration asks for EXACTLY the ids the authority returned.
      expect(execute).toHaveBeenCalledWith(["stu-1"]);
      expect(result).toEqual({
        ok: true,
        data: [
          {
            id: "stu-1",
            name: "Nguyễn Minh Anh",
            dob: "15/03/2010",
            gender: "F",
            status: "active",
          },
        ],
      });
    });
  }

  it("never fabricates a roster in real mode — a failing core read surfaces as a failure, not mock students", async () => {
    stubRealDeps(
      vi.fn(async () => {
        throw new Error("core down");
      }),
    );

    const repo = await makeWithEnv("false");
    const result = await repo.getClassRoster("cls-10a1");

    expect(result).toEqual({ ok: false, error: { type: "network-error" } });
  });

  it("keeps the roster when only the IAM decoration fails — placeholders, not an error screen", async () => {
    stubRealDeps(
      undefined,
      vi.fn(async () => {
        throw new Error("iam down");
      }),
    );

    const repo = await makeWithEnv("false");
    const result = await repo.getClassRoster("cls-10a1");

    expect(result).toEqual({
      ok: true,
      data: [{ id: "stu-1", status: "active" }],
    });
  });
});

describe("makeRosterRepository — getSearchPool (STILL force-mocked, separate gap)", () => {
  for (const value of [undefined, "false", "true"] as const) {
    it(`serves the mock pool with zero HTTP when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      // core exposes no unassigned-student query, so there is nothing to call.
      // US-169's dob/gender addition does not change that: a lookup BY ID
      // cannot enumerate a candidate pool.
      const { get } = stubRealDeps();

      const repo = await makeWithEnv(value);
      const result = await repo.getSearchPool("cls-10a1");

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.length).toBeGreaterThan(0);
      expect(get).not.toHaveBeenCalled();
    });
  }
});
