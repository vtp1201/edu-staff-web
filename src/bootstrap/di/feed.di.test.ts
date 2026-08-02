/**
 * Unit tests — `feed.di.ts` env matrix (US-E18.31).
 *
 * The feed factory stopped being unconditionally force-mocked (US-E18.20) once
 * BE US-165 denormalized `authorName`/`authorRole` onto `Post`/`Comment`:
 *
 * - `NEXT_PUBLIC_USE_MOCK="true"` → the pure {@link MockFeedRepository} (the
 *   full demo experience, unchanged).
 * - flag `"false"` or unset → {@link HybridFeedRepository}: REAL reads,
 *   force-mocked mutations (reaction taxonomy + attachment capability are still
 *   unresolved — see the factory's doc comment).
 *
 * Every use-case is exercised because each calls `makeRepo()` independently — a
 * partial swap would leak one path back to the mock (or the real repo).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

/**
 * Ordered record of the server-side side effects the factory performs. The
 * mocks are registered ONCE, here — re-registering `vi.doMock` for the same
 * module inside an individual test made the suite flaky (the factory sometimes
 * resolved to the `beforeEach` version, dropping the "refresh" entry), so every
 * case reads this shared recorder instead.
 */
const calls: string[] = [];

beforeEach(() => {
  vi.resetModules();
  calls.length = 0;
  vi.doMock("@/bootstrap/lib/http.server", () => ({
    createServerHttpClient: vi.fn(async () => {
      calls.push("http");
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
  vi.doUnmock("@/bootstrap/lib/http.server");
  vi.doUnmock("@/bootstrap/di/auth.di");
});

/**
 * `vi.resetModules()` gives each import a fresh class identity, so `instanceof`
 * is unusable — every use-case holds its repository as its ONLY object-valued
 * field, so read it back and compare `constructor.name`.
 */
function repoOf(useCase: object): { constructor: { name: string } } {
  const objects = Object.values(useCase).filter(
    (v): v is object => typeof v === "object" && v !== null,
  );
  expect(objects).toHaveLength(1);
  return objects[0];
}

async function importDiWithEnv(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  return import("./feed.di");
}

async function allUseCases(value: string | undefined) {
  const di = await importDiWithEnv(value);
  return Promise.all([
    di.makeListFeedUseCase(),
    di.makeCreatePostUseCase(),
    di.makeReactToPostUseCase(),
    di.makeListCommentsUseCase(),
    di.makeAddCommentUseCase(),
    di.makeTogglePinUseCase(),
  ]);
}

describe("feed.di — USE_MOCK ? Mock : Hybrid", () => {
  it('every factory resolves MockFeedRepository when NEXT_PUBLIC_USE_MOCK="true"', async () => {
    for (const useCase of await allUseCases("true")) {
      expect(repoOf(useCase).constructor.name).toBe("MockFeedRepository");
    }
  });

  for (const value of [undefined, "false"] as const) {
    it(`every factory resolves HybridFeedRepository when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      for (const useCase of await allUseCases(value)) {
        expect(repoOf(useCase).constructor.name).toBe("HybridFeedRepository");
      }
    });
  }

  it("never creates a server http client (nor refreshes) in mock mode", async () => {
    await allUseCases("true");
    expect(calls).toEqual([]);
  });

  it("refreshes the session BEFORE creating the http client in real mode", async () => {
    const di = await importDiWithEnv("false");
    await di.makeListFeedUseCase();
    expect(calls).toEqual(["refresh", "http"]);
  });
});
