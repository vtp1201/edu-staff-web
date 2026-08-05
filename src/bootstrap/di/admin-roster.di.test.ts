/**
 * Unit tests — `makeRosterRepository()` env matrix (US-E18.35 + US-E18.41).
 *
 * US-E18.5 pinned `getClassRoster` AND `getSearchPool` to the mock repository
 * UNCONDITIONALLY, for two UNRELATED reasons. Both are now closed:
 * IAM US-144/US-169 gave the roster its display fields (US-E18.35), and BE
 * US-182 / `edu-api` ADR 0125 gave the pool its missing half — the enrolled-id
 * set to subtract from the IAM STUDENT directory (US-E18.41). So BOTH methods
 * must now behave like every other read: mock ONLY when
 * `NEXT_PUBLIC_USE_MOCK === "true"`.
 *
 * The dangerous direction is the flag being `"false"` or UNSET (i.e.
 * production — `USE_MOCK` is false when unset): an admin must NOT be shown a
 * seeded roster of 32 students who are not in the class, nor a seeded candidate
 * pool of students who may not exist in this tenant at all.
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
  vi.doUnmock("@/bootstrap/di/calendar.di");
  vi.doUnmock("@/bootstrap/lib/auth-token.server");
  vi.doUnmock("@/bootstrap/lib/jwt");
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
    // The real branch also wires the STUDENT directory for the search pool
    // (US-E18.41); these roster tests never read it.
    makeSearchMembersUseCase: vi.fn(async () => ({
      execute: vi.fn(async () => ({ ok: true, value: [] })),
    })),
  }));
  stubTenantSeams();
  return { get, execute };
}

/** Token-derived tenant id — read once per factory call since US-E18.41. */
function stubTenantSeams() {
  vi.doMock("@/bootstrap/lib/auth-token.server", () => ({
    getAccessToken: vi.fn(async () => "jwt-token"),
  }));
  vi.doMock("@/bootstrap/lib/jwt", () => ({
    decodeTenantId: vi.fn(() => "tenant-1"),
  }));
}

/**
 * Seams the real `getSearchPool` branch touches: core's ids-only enrolled read
 * (plain unwrapped GET), IAM's STUDENT directory drain, the calendar feature's
 * academic-year list, and the token-derived tenant id.
 */
function stubPoolDeps(
  over: {
    get?: ReturnType<typeof vi.fn>;
    searchExecute?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const get =
    over.get ??
    vi.fn(async () => ({
      academicYear: "2025-2026",
      studentMemberIds: ["stu-1", "stu-3"],
    }));
  const searchExecute =
    over.searchExecute ??
    vi.fn(async () => ({
      ok: true as const,
      value: [
        { memberId: "stu-1", userId: "stu-1", displayName: "Nguyễn Minh Anh" },
        { memberId: "stu-2", userId: "stu-2", displayName: "Trần Văn Bình" },
        { memberId: "stu-3", userId: "stu-3", displayName: "Lê Thu Cúc" },
      ],
    }));
  const listYears = vi.fn(async () => [
    { id: "ay-1", label: "2025-2026", isActive: true, terms: [] },
  ]);

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
    makeBatchResolveMembersUseCase: vi.fn(async () => ({
      execute: vi.fn(async () => ({ ok: true, value: [] })),
    })),
    makeSearchMembersUseCase: vi.fn(async () => ({ execute: searchExecute })),
  }));
  vi.doMock("@/bootstrap/di/calendar.di", () => ({
    makeListYearsUseCase: vi.fn(async () => ({ execute: listYears })),
  }));
  stubTenantSeams();

  return { get, searchExecute, listYears };
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

describe("makeRosterRepository — getSearchPool (un-mocked in US-E18.41)", () => {
  it('serves the seeded mock pool with zero HTTP only when NEXT_PUBLIC_USE_MOCK="true"', async () => {
    const { get, searchExecute } = stubPoolDeps();

    const repo = await makeWithEnv("true");
    const result = await repo.getSearchPool("cls-10a1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.length).toBeGreaterThan(0);
    expect(get).not.toHaveBeenCalled();
    expect(searchExecute).not.toHaveBeenCalled();
  });

  for (const value of [undefined, "false"] as const) {
    it(`composes the REAL STUDENT directory MINUS core's enrolled ids when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      const { searchExecute, listYears } = stubPoolDeps();

      const repo = await makeWithEnv(value);
      const result = await repo.getSearchPool("cls-10a1");

      // The role filter + the server-derived tenant id are pinned HERE so the
      // repository never owns them (class-management.di precedent).
      expect(searchExecute).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        role: "STUDENT",
      });
      // The academic year comes from the already-real calendar feature, not a
      // second "which year is active" derivation.
      expect(listYears).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: true,
        data: [
          {
            id: "stu-2",
            name: "Trần Văn Bình",
            currentClassId: null,
            currentClassName: null,
          },
        ],
      });
    });
  }

  it("never fabricates a pool in real mode — a failing directory read surfaces as a failure, not mock students", async () => {
    stubPoolDeps({
      searchExecute: vi.fn(async () => ({
        ok: false as const,
        failure: { type: "forbidden" as const },
      })),
    });

    const repo = await makeWithEnv("false");
    const result = await repo.getSearchPool("cls-10a1");

    expect(result).toEqual({ ok: false, error: { type: "forbidden" } });
  });
});
