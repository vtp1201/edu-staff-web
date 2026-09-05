/**
 * Unit tests — `discipline.di.ts` after the PARTIAL un-force-mock (US-E24.11).
 *
 * US-E18.14 force-mocked every factory in this file regardless of `USE_MOCK`.
 * US-E24.11 un-forces EXACTLY THREE operations — `makeGetLeaveRequestsUseCase`
 * plus the approve/reject pair inside `makeDecideLeaveUseCases` — because the
 * GVCN
 * homeroom leave inbox is the one conduct surface neither blocker reaches
 * (no roster UUID needed, no self-scope discovery needed).
 *
 * These tests therefore assert BOTH halves: the three leave factories follow
 * `USE_MOCK`, and every other factory in the file is still mock-backed even
 * when `USE_MOCK` is false. `USE_MOCK` is FALSE when the env var is unset, so
 * the unset case is a REAL-mode case.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

function makeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.sig`;
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("@/bootstrap/lib/http.server");
  vi.doUnmock("@/bootstrap/di/auth.di");
  vi.doUnmock("@/bootstrap/di/iam-directory.di");
  vi.doUnmock("@/bootstrap/di/teacher-class.di");
  vi.doUnmock("@/bootstrap/lib/auth-token.server");
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
});

/** Stub every server-only seam the real branch touches. */
function stubServerSeams(
  opts: {
    token?: string | null;
    classes?: Array<{ id: string; roles: string[] }>;
    /** Replaces the whole class-list read — a rejected/failed read must yield
     *  an EMPTY scope. Passed here rather than re-`doMock`ing the same module
     *  in the test body: a second registration for a path already registered
     *  by this helper does not reliably win, which made two deny-by-default
     *  cases order-dependent (one of them failing on the branch). */
    listMyClasses?: () => Promise<unknown>;
  } = {},
) {
  const createServerHttpClient = vi
    .fn()
    .mockResolvedValue({ get: vi.fn(), post: vi.fn() });
  const ensureFreshSession = vi.fn().mockResolvedValue(undefined);
  const listMyClasses = opts.listMyClasses
    ? vi.fn(opts.listMyClasses)
    : vi.fn().mockResolvedValue({
        ok: true,
        data: opts.classes ?? [
          { id: "cls-10a1", roles: ["homeroom", "subject"] },
          { id: "cls-11b2", roles: ["subject"] },
        ],
      });
  vi.doMock("@/bootstrap/lib/http.server", () => ({ createServerHttpClient }));
  vi.doMock("@/bootstrap/di/auth.di", () => ({ ensureFreshSession }));
  vi.doMock("@/bootstrap/lib/auth-token.server", () => ({
    getAccessToken: vi
      .fn()
      .mockResolvedValue(
        opts.token === undefined
          ? makeJwt({ memberId: "m-1", role: "teacher", tenantId: "t-1" })
          : opts.token,
      ),
  }));
  vi.doMock("@/bootstrap/di/iam-directory.di", () => ({
    makeBatchResolveMembersUseCase: async () => ({
      execute: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    }),
  }));
  vi.doMock("@/bootstrap/di/teacher-class.di", () => ({
    makeListMyTeacherClassesUseCase: async () => ({ execute: listMyClasses }),
  }));
  return { createServerHttpClient, ensureFreshSession, listMyClasses };
}

async function di(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  return import("./discipline.di");
}

/** The private `repo` field the use-cases hold — read for its class identity
 *  only (`vi.resetModules()` breaks `instanceof`, so compare the name). */
function repoNameOf(useCase: unknown): string {
  return (useCase as { repo: object }).repo.constructor.name;
}

const REAL_MODES = [undefined, "false"] as const;

describe("discipline.di — the THREE un-forced leave factories (US-E24.11)", () => {
  it("mock mode still builds the mock repository", async () => {
    // The seams are stubbed even in mock mode: `makeDecideLeaveUseCases()`
    // ALWAYS assembles the auth context (there is no context-free factory any
    // more), and that reads the token cookie.
    stubServerSeams();
    const mod = await di("true");
    expect(repoNameOf(await mod.makeGetLeaveRequestsUseCase())).toBe(
      "MockDisciplineRepository",
    );
    const decide = await mod.makeDecideLeaveUseCases();
    expect(repoNameOf(decide.approve)).toBe("MockDisciplineRepository");
    expect(repoNameOf(decide.reject)).toBe("MockDisciplineRepository");
  });

  for (const mode of REAL_MODES) {
    it(`real mode (NEXT_PUBLIC_USE_MOCK=${String(mode)}) builds the REAL repository for all three`, async () => {
      stubServerSeams();
      const mod = await di(mode);
      expect(repoNameOf(await mod.makeGetLeaveRequestsUseCase())).toBe(
        "DisciplineRepository",
      );
      const decide = await mod.makeDecideLeaveUseCases();
      expect(repoNameOf(decide.approve)).toBe("DisciplineRepository");
      expect(repoNameOf(decide.reject)).toBe("DisciplineRepository");
    });
  }

  it("refreshes the session before building the real client (decision 0018)", async () => {
    const { ensureFreshSession } = stubServerSeams();
    const mod = await di("false");
    await mod.makeGetLeaveRequestsUseCase();
    expect(ensureFreshSession).toHaveBeenCalled();
  });

  it("never creates a server http client in mock mode", async () => {
    const { createServerHttpClient } = stubServerSeams();
    const mod = await di("true");
    await mod.makeGetLeaveRequestsUseCase();
    expect(createServerHttpClient).not.toHaveBeenCalled();
  });
});

describe("discipline.di — every OTHER factory is STILL force-mocked (US-E18.14 holds)", () => {
  for (const mode of REAL_MODES) {
    it(`real mode (NEXT_PUBLIC_USE_MOCK=${String(mode)}) still returns the mock repository for the non-leave factories`, async () => {
      stubServerSeams();
      const mod = await di(mode);

      const factories = [
        mod.makeGetViolationsUseCase,
        mod.makeRecordViolationUseCase,
        mod.makeDeleteViolationUseCase,
        mod.makeGetConductSummaryUseCase,
        mod.makeOverrideConductGradeUseCase,
        mod.makeGetMyConductSummaryUseCase,
        mod.makeGetMyViolationsUseCase,
        mod.makeGetMyLeaveRequestsUseCase,
        mod.makeSubmitLeaveRequestUseCase,
        mod.makeGetChildrenUseCase,
        mod.makeGetChildConductSummaryUseCase,
        mod.makeGetChildViolationsUseCase,
        mod.makeGetChildLeaveRequestsUseCase,
        mod.makeSubmitChildLeaveRequestUseCase,
      ];

      for (const make of factories) {
        expect(repoNameOf(await make())).toBe("MockDisciplineRepository");
      }
      expect((await mod.makeDisciplineRepository()).constructor.name).toBe(
        "MockDisciplineRepository",
      );
    });
  }
});

describe("makeLeaveDecisionAuthContext — decision 0063 assembly", () => {
  it("real mode reads the role from the token claim and the scope from the teacher's OWN class list", async () => {
    stubServerSeams();
    const mod = await di("false");

    const ctx = await mod.makeLeaveDecisionAuthContext();

    expect(ctx.role).toBe("teacher");
    // ONLY the homeroom class — a subject-only class is not a decidable scope.
    expect(ctx.homeroomClassIds).toEqual(["cls-10a1"]);
  });

  it("denies by default when the class list read fails (empty scope, never a wildcard)", async () => {
    stubServerSeams({
      listMyClasses: async () => ({
        ok: false,
        error: { type: "network-error" },
      }),
    });
    const mod = await di("false");

    expect((await mod.makeLeaveDecisionAuthContext()).homeroomClassIds).toEqual(
      [],
    );
  });

  it("denies by default when the class list read throws", async () => {
    stubServerSeams({
      listMyClasses: async () => {
        throw new Error("boom");
      },
    });
    const mod = await di("false");

    expect((await mod.makeLeaveDecisionAuthContext()).homeroomClassIds).toEqual(
      [],
    );
  });

  it("an unreadable token yields a role that can never decide", async () => {
    stubServerSeams({ token: null });
    const mod = await di("false");

    const ctx = await mod.makeLeaveDecisionAuthContext();
    expect(ctx.role).not.toBe("teacher");
  });

  it("mock mode pins the role to `teacher` (decodeRoleClaim answers a synthetic `admin` there, which would deny every demo decision)", async () => {
    stubServerSeams();
    const mod = await di("true");

    const ctx = await mod.makeLeaveDecisionAuthContext();
    expect(ctx.role).toBe("teacher");
    // The SCOPE half is never hinted — it still comes from the class list.
    expect(ctx.homeroomClassIds).toEqual(["cls-10a1"]);
  });

  for (const mode of REAL_MODES) {
    it(`real mode (NEXT_PUBLIC_USE_MOCK=${String(mode)}) ignores the demo hint — a non-teacher claim stays non-teacher`, async () => {
      stubServerSeams({
        token: makeJwt({ memberId: "m-1", role: "ADMIN", tenantId: "t-1" }),
      });
      const mod = await di(mode);

      expect((await mod.makeLeaveDecisionAuthContext()).role).not.toBe(
        "teacher",
      );
    });
  }

  // The review of US-E24.11 deleted the bare `makeApproveLeaveUseCase()` /
  // `makeRejectLeaveUseCase()` pair: they built a decision use-case with NO
  // context, and the (then-optional) `authCtx` made that a fail-OPEN mutation.
  // This is the structural guard that they stay deleted.
  it("exposes NO way to build a decision use-case without a context", async () => {
    const mod = await di("true");
    expect(mod).not.toHaveProperty("makeApproveLeaveUseCase");
    expect(mod).not.toHaveProperty("makeRejectLeaveUseCase");
  });

  it("makeDecideLeaveUseCases bundles both use-cases WITH the context, so an action cannot forget it", async () => {
    stubServerSeams();
    const mod = await di("false");

    const { approve, reject, authCtx } = await mod.makeDecideLeaveUseCases();

    expect(approve.constructor.name).toBe("ApproveLeaveUseCase");
    expect(reject.constructor.name).toBe("RejectLeaveUseCase");
    expect(authCtx).toEqual({
      role: "teacher",
      homeroomClassIds: ["cls-10a1"],
    });
    // ONE repository instance shared by both — not two http clients per action.
    expect(repoNameOf(approve)).toBe("DisciplineRepository");
    expect(repoNameOf(reject)).toBe("DisciplineRepository");
  });
});
