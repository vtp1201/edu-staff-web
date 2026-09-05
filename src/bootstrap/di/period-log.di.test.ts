/**
 * Unit tests — `makePeriodLogAuthContext()` env matrix (US-E24.9, decision 0063).
 *
 * This is the ONE place the period-log/period-prep authorization context is
 * assembled, so it is the one place the claim-wins rule can be proven:
 *
 * - REAL mode (`NEXT_PUBLIC_USE_MOCK` unset or `"false"`) must IGNORE the demo
 *   hint (`MOCK_SLOT_TEACHER_MEMBER_ID`) entirely — the token claim always wins.
 * - `memberId` is read with `decodeMemberIdClaim` (claim ONLY, decision 0074):
 *   a token carrying just `sub` must yield `""`, never the `sub` value, because
 *   only the claim proves the session is tenant-scoped. `""` can never equal a
 *   real `teacherMemberId`, so every write is denied — deny-by-default.
 * - MOCK mode substitutes the seeded demo teacher so the local demo is usable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_SLOT_TEACHER_MEMBER_ID } from "@/features/timetable/infrastructure/repositories/mocks/fixtures";

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
  vi.doUnmock("@/bootstrap/lib/auth-token.server");
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
});

async function authCtxWith(
  useMock: string | undefined,
  token: string | null,
): Promise<{ role: string; memberId: string }> {
  if (useMock === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = useMock;
  vi.doMock("@/bootstrap/lib/auth-token.server", () => ({
    getAccessToken: vi.fn().mockResolvedValue(token),
  }));
  const { makePeriodLogAuthContext } = await import("./period-log.di");
  return makePeriodLogAuthContext();
}

const REAL_MODES = [undefined, "false"] as const;

describe("makePeriodLogAuthContext", () => {
  for (const mode of REAL_MODES) {
    it(`real mode (NEXT_PUBLIC_USE_MOCK=${String(mode)}) takes both fields from the token claim`, async () => {
      const ctx = await authCtxWith(
        mode,
        makeJwt({ memberId: "m-real", role: "teacher", tenantId: "t-1" }),
      );

      expect(ctx).toEqual({ role: "teacher", memberId: "m-real" });
      // The demo hint never leaks into a real session.
      expect(ctx.memberId).not.toBe(MOCK_SLOT_TEACHER_MEMBER_ID);
    });

    it(`real mode (NEXT_PUBLIC_USE_MOCK=${String(mode)}) refuses a token that carries only \`sub\` (no memberId claim)`, async () => {
      const ctx = await authCtxWith(
        mode,
        makeJwt({ sub: "u-42", role: "teacher" }),
      );

      // NOT "u-42": `decodeMemberIdClaim` has no `sub` fallback, so a session
      // that never picked a tenant owns no slot at all.
      expect(ctx.memberId).toBe("");
    });
  }

  it("real mode with no readable token denies everything (empty id, least-privileged role)", async () => {
    expect(await authCtxWith("false", null)).toEqual({
      role: "student",
      memberId: "",
    });
    expect(await authCtxWith("false", "not.a.jwt")).toEqual({
      role: "student",
      memberId: "",
    });
  });

  it("mock mode substitutes the seeded demo teacher regardless of the token", async () => {
    const ctx = await authCtxWith(
      "true",
      makeJwt({ memberId: "m-real", role: "principal" }),
    );

    expect(ctx).toEqual({
      role: "teacher",
      memberId: MOCK_SLOT_TEACHER_MEMBER_ID,
    });
  });
});
