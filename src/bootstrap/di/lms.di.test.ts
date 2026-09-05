/**
 * Unit tests — `lms.di.ts` env matrix (US-E24.1, ADR 0075).
 *
 * This is the INVERSE of the US-E18.60 suite it replaces. That one proved the
 * factory could never reach the real repository (the `lms` service was a
 * scaffold, ADR 0073). BE shipped the contract, so the assertion flips: the
 * standard `USE_MOCK ? Mock : Real` gate must be back, and the real branch
 * must actually build an authenticated http client.
 *
 * Every factory is exercised because each calls `makeRepo()` independently — a
 * partial revert would leave one path pinned to the mock.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

/** Ordered record of the server-side side effects the factory performs. */
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

async function allUseCases(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  const di = await import("./lms.di");
  const factories = [
    di.makeListCoursesUseCase,
    di.makeListCoursesWithSummaryUseCase,
    di.makeListCoursesWithItemsUseCase,
    di.makeGetCourseUseCase,
    di.makeListCourseItemsUseCase,
    di.makeGetLessonUseCase,
    di.makeGetAssignmentDetailUseCase,
    di.makeSubmitAssignmentUseCase,
  ];
  // SEQUENTIAL on purpose: `calls` is asserted as an ORDERED log, and
  // `Promise.all` would interleave the refresh/client pairs.
  const useCases: object[] = [];
  for (const factory of factories) useCases.push(await factory());
  return useCases;
}

const FACTORY_COUNT = 8;

describe("lms.di — standard USE_MOCK gate (ADR 0075 supersedes 0073)", () => {
  it("NEXT_PUBLIC_USE_MOCK=true → every factory resolves MockLmsRepository", async () => {
    const useCases = await allUseCases("true");
    expect(useCases).toHaveLength(FACTORY_COUNT);
    for (const useCase of useCases) {
      expect(repoOf(useCase).constructor.name).toBe("MockLmsRepository");
    }
  });

  it("NEXT_PUBLIC_USE_MOCK=true → never touches the network stack", async () => {
    await allUseCases("true");
    expect(calls).toEqual([]);
  });

  for (const value of ["false", undefined] as const) {
    it(`NEXT_PUBLIC_USE_MOCK=${String(value)} → every factory resolves the REAL LmsRepository`, async () => {
      const useCases = await allUseCases(value);
      expect(useCases).toHaveLength(FACTORY_COUNT);
      for (const useCase of useCases) {
        expect(repoOf(useCase).constructor.name).toBe("LmsRepository");
      }
    });

    it(`NEXT_PUBLIC_USE_MOCK=${String(value)} → refreshes the session BEFORE building the client, once per factory`, async () => {
      await allUseCases(value);
      // Proactive refresh must precede the client build on every call
      // (decision 0018) — a pair per factory, in that order.
      expect(calls).toEqual(
        Array.from({ length: FACTORY_COUNT }, () => ["refresh", "http"]).flat(),
      );
    });
  }
});
