/**
 * Unit tests — `makeGetChildListUseCase()` env matrix (US-E18.33).
 *
 * ADR 0054 pinned this factory to `MockGradeBookRepository` UNCONDITIONALLY,
 * because no endpoint a PARENT could call resolved a student's display name.
 * IAM ADR-0120 removed that blocker, so the factory must now behave like every
 * other un-mocked feature: mock ONLY when `NEXT_PUBLIC_USE_MOCK === "true"`.
 *
 * The regression this locks in is the dangerous direction: with the flag
 * `"false"` or UNSET (i.e. production — `USE_MOCK` is false when unset), a
 * parent must NOT be shown a fabricated roster of two children who are not
 * theirs.
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
  vi.doUnmock("@/bootstrap/lib/auth-token.server");
  vi.doUnmock("@/bootstrap/di/auth.di");
  vi.doUnmock("@/bootstrap/di/iam-directory.di");
  vi.doUnmock("@/bootstrap/lib/jwt");
});

/**
 * `vi.resetModules()` gives every import a fresh class identity, so
 * `instanceof` is useless here — compare the constructor name of the
 * use-case's only object-valued field (its repository).
 */
function repoOf(useCase: object): { constructor: { name: string } } {
  const objects = Object.values(useCase).filter(
    (v) => typeof v === "object" && v !== null,
  );
  expect(objects).toHaveLength(1);
  return objects[0];
}

function stubRealDeps(get = vi.fn(async () => ({ links: [] }))) {
  vi.doMock("@/bootstrap/di/auth.di", () => ({
    ensureFreshSession: vi.fn(async () => {}),
  }));
  vi.doMock("@/bootstrap/lib/http.server", () => ({
    createServerHttpClient: vi.fn(async () => ({ get })),
  }));
  vi.doMock("@/bootstrap/lib/auth-token.server", () => ({
    getAccessToken: vi.fn(async () => "token"),
  }));
  // The parent's OWN memberId comes from the token `sub` claim — never a
  // client-supplied id. Stubbed so the factory reaches the network path.
  vi.doMock("@/bootstrap/lib/jwt", () => ({
    decodeSubClaim: vi.fn(() => "p-1"),
  }));
  vi.doMock("@/bootstrap/di/iam-directory.di", () => ({
    makeBatchResolveMembersUseCase: vi.fn(async () => ({
      execute: vi.fn(async () => ({ ok: true, value: [] })),
    })),
  }));
  return get;
}

async function makeWithEnv(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  const { makeGetChildListUseCase } = await import("./grades.di");
  return makeGetChildListUseCase();
}

describe("makeGetChildListUseCase (parent child-switcher roster)", () => {
  it('serves the seeded mock roster only when NEXT_PUBLIC_USE_MOCK="true"', async () => {
    const useCase = await makeWithEnv("true");
    expect(repoOf(useCase).constructor.name).toBe("MockGradeBookRepository");

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.length).toBeGreaterThan(0);
  });

  for (const value of [undefined, "false"] as const) {
    it(`uses the REAL linked-students + IAM composition when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      const get = stubRealDeps();
      const useCase = await makeWithEnv(value);
      expect(repoOf(useCase).constructor.name).toBe(
        "ParentChildListRepository",
      );

      const result = await useCase.execute();
      expect(result).toEqual({ ok: true, data: [] });
      expect(get).toHaveBeenCalledTimes(1);
    });
  }

  it("never fabricates a roster in real mode — a failing real read surfaces as a failure, not mock children", async () => {
    stubRealDeps(
      vi.fn(async () => {
        throw new Error("core down");
      }),
    );
    const useCase = await makeWithEnv("false");
    const result = await useCase.execute();
    expect(result).toEqual({ ok: false, error: { type: "network-error" } });
  });

  it("never constructs a server http client in mock mode", async () => {
    const createServerHttpClient = vi.fn();
    vi.doMock("@/bootstrap/lib/http.server", () => ({
      createServerHttpClient,
    }));
    const useCase = await makeWithEnv("true");
    await useCase.execute();
    expect(createServerHttpClient).not.toHaveBeenCalled();
  });
});
