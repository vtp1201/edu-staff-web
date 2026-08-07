/**
 * Unit tests — `invitation-redeem.di.ts` env matrix + the security property
 * that makes this factory different from every other one (US-E18.53).
 *
 * Both endpoints are PUBLIC, so the factory must build a BARE http client:
 * never `createServerHttpClient()` (which would attach whatever `auth_token`
 * cookie happens to be on the device) and never `ensureFreshSession()` (there
 * is no session to refresh, and refreshing someone else's is pure waste).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

const calls: string[] = [];

beforeEach(() => {
  vi.resetModules();
  calls.length = 0;
  vi.doMock("@/bootstrap/lib/http", () => ({
    createHttpClient: vi.fn((token?: string) => {
      calls.push(token === undefined ? "http:no-token" : "http:token");
      return {};
    }),
  }));
  vi.doMock("@/bootstrap/lib/http.server", () => ({
    createServerHttpClient: vi.fn(async () => {
      calls.push("http.server");
      return {};
    }),
  }));
  vi.doMock("@/bootstrap/di/auth.di", () => ({
    ensureFreshSession: vi.fn(async () => {
      calls.push("refresh");
    }),
  }));
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
  vi.doUnmock("@/bootstrap/lib/http");
  vi.doUnmock("@/bootstrap/lib/http.server");
  vi.doUnmock("@/bootstrap/di/auth.di");
});

/**
 * `vi.resetModules()` gives each import a fresh class identity, so `instanceof`
 * is unusable — each use-case holds its repository as its ONLY object-valued
 * field, so read it back and compare `constructor.name`.
 */
function repoNameOf(useCase: object): string {
  const objects = Object.values(useCase).filter(
    (v): v is object => typeof v === "object" && v !== null,
  );
  expect(objects).toHaveLength(1);
  return objects[0].constructor.name;
}

async function importDiWithEnv(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  return import("./invitation-redeem.di");
}

describe("invitation-redeem.di — env matrix", () => {
  it("USE_MOCK=true → both factories build the mock repository, zero http client", async () => {
    const di = await importDiWithEnv("true");
    expect(repoNameOf(await di.makeLookupInvitationUseCase())).toBe(
      "MockInvitationRedeemRepository",
    );
    expect(repoNameOf(await di.makeRedeemInvitationUseCase())).toBe(
      "MockInvitationRedeemRepository",
    );
    expect(calls).toEqual([]);
  });

  it.each([
    "false",
    undefined,
  ])("USE_MOCK=%p → both factories build the real repository", async (value) => {
    const di = await importDiWithEnv(value);
    expect(repoNameOf(await di.makeLookupInvitationUseCase())).toBe(
      "InvitationRedeemRepository",
    );
    expect(repoNameOf(await di.makeRedeemInvitationUseCase())).toBe(
      "InvitationRedeemRepository",
    );
  });
});

describe("invitation-redeem.di — public-endpoint discipline", () => {
  it("real mode builds a BARE client: createHttpClient() with NO token, never the cookie-reading server client", async () => {
    const di = await importDiWithEnv("false");
    await di.makeRedeemInvitationUseCase();
    expect(calls).toEqual(["http:no-token"]);
    expect(calls).not.toContain("http.server");
  });

  it("never pre-refreshes a session — there is none, and refreshing a bystander's is not this flow's business", async () => {
    const di = await importDiWithEnv("false");
    await di.makeLookupInvitationUseCase();
    await di.makeRedeemInvitationUseCase();
    expect(calls).not.toContain("refresh");
  });
});
