/**
 * US-E18.21 (closes ADR 0055 §Follow-Up) — `makeRepository()` in
 * `academic-records.di.ts` (the read-only student/parent VIEWER factory) is
 * PERMANENTLY mock-first: it must resolve `MockAcademicRecordsRepository` even
 * with `NEXT_PUBLIC_USE_MOCK=false`, because the hold is a domain-model/shape
 * gap in `core`'s real contract (ADR 0055 §Context #6), not the app-wide mock
 * toggle. This is the regression guard for the day that flag flips.
 *
 * The seal factory (`makeSealRepository()`) is deliberately NOT force-mocked —
 * `sealBatch` runs REAL via the hybrid facade (US-E18.13). The last case locks
 * that in, so a future over-eager force-mock of this file can't silently
 * un-wire the one real operation the feature has.
 *
 * Repositories are identified by `constructor.name` rather than `instanceof`:
 * `vi.resetModules()` gives each import a fresh class identity per module
 * graph, so `instanceof` against a separately-imported class is unreliable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("@/bootstrap/lib/http.server");
  vi.doUnmock("@/bootstrap/di/auth.di");
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
});

function setEnv(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
}

/** Every use-case stores its collaborator repository as its sole object field. */
function repoNameOf(useCase: unknown): string {
  const values = Object.values(useCase as Record<string, unknown>).filter(
    (v): v is object => typeof v === "object" && v !== null,
  );
  expect(values).toHaveLength(1);
  return values[0].constructor.name;
}

describe("academic-records.di — viewer factory is force-mocked", () => {
  for (const value of [undefined, "false", "true"] as const) {
    it(`viewer use-cases resolve MockAcademicRecordsRepository when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      setEnv(value);
      const di = await import("./academic-records.di");

      const useCases = await Promise.all([
        di.makeGetAcademicRecordUseCase(),
        di.makeListAcademicYearsUseCase(),
      ]);

      for (const useCase of useCases) {
        expect(repoNameOf(useCase)).toBe("MockAcademicRecordsRepository");
      }
    });
  }

  it("never creates a server http client for the viewer factories", async () => {
    const createServerHttpClient = vi.fn();
    vi.doMock("@/bootstrap/lib/http.server", () => ({
      createServerHttpClient,
    }));
    setEnv("false");
    const di = await import("./academic-records.di");

    await di.makeGetAcademicRecordUseCase();
    await di.makeListAcademicYearsUseCase();

    expect(createServerHttpClient).not.toHaveBeenCalled();
  });
});

describe("academic-records.di — seal factory stays hybrid (regression guard)", () => {
  it("seal use-cases resolve the mock seal repo when USE_MOCK=true", async () => {
    setEnv("true");
    const di = await import("./academic-records.di");

    expect(repoNameOf(await di.makeSealAcademicRecordUseCase())).toBe(
      "MockAcademicRecordsSealRepository",
    );
  });

  it("seal use-cases still resolve the REAL hybrid facade when USE_MOCK=false", async () => {
    const createServerHttpClient = vi.fn(async () => ({}));
    const ensureFreshSession = vi.fn(async () => {});
    vi.doMock("@/bootstrap/lib/http.server", () => ({
      createServerHttpClient,
    }));
    vi.doMock("@/bootstrap/di/auth.di", () => ({ ensureFreshSession }));
    setEnv("false");
    const di = await import("./academic-records.di");

    expect(repoNameOf(await di.makeSealAcademicRecordUseCase())).toBe(
      "HybridAcademicRecordsSealRepository",
    );
    expect(ensureFreshSession).toHaveBeenCalled();
    expect(createServerHttpClient).toHaveBeenCalled();
  });
});
