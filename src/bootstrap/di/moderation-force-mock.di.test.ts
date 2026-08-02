import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * US-E18.20 AC-1 (narrowed to moderation by US-E18.31) — `moderation.di.ts` is
 * PERMANENTLY mock-first: it must resolve `MockModerationRepository` even with
 * `NEXT_PUBLIC_USE_MOCK=false`, because the hold is a domain-model/shape gap in
 * `social`'s real contract, not the app-wide mock toggle (see the factory's doc
 * comment). This is the regression guard for the day that flag flips.
 *
 * `feed.di.ts` left this file with US-E18.31: BE US-165 closed its identity gap,
 * so the feed factory is now `USE_MOCK ? Mock : Hybrid` — its env matrix lives
 * in `feed.di.test.ts`.
 *
 * Every use-case is exercised, since each calls `makeRepo()` independently — a
 * partial force-mock would silently leak the real repository (and its
 * `createServerHttpClient()` cookie read) into one code path.
 *
 * The repository is identified by `constructor.name` rather than `instanceof`:
 * `vi.resetModules()` between cases yields a fresh class identity per module
 * graph, so `instanceof` against a separately-imported class is unreliable.
 */
type WithRepo = { [k: string]: unknown };

function repoNameOf(useCase: unknown): string {
  // Every use-case stores its collaborator as its sole constructor field.
  const values = Object.values(useCase as WithRepo).filter(
    (v): v is object => typeof v === "object" && v !== null,
  );
  expect(values).toHaveLength(1);
  return values[0].constructor.name;
}

describe("moderation.di — force-mocked regardless of USE_MOCK", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("moderation factories resolve MockModerationRepository with USE_MOCK=false", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const di = await import("./moderation.di");

    const useCases = await Promise.all([
      di.makeSubmitReportUseCase(),
      di.makeListReportsUseCase(),
      di.makeDismissReportUseCase(),
      di.makeRemoveContentUseCase(),
      di.makeGetModerationAuditLogUseCase(),
    ]);

    for (const useCase of useCases) {
      expect(repoNameOf(useCase)).toBe("MockModerationRepository");
    }

    // The bare-repository escape hatch (detail sheet) must be mocked too.
    const repo = await di.makeModerationRepository();
    expect(repo.constructor.name).toBe("MockModerationRepository");
  });

  it("still resolves the mock when USE_MOCK is unset entirely", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "");
    const modDi = await import("./moderation.di");

    expect(repoNameOf(await modDi.makeListReportsUseCase())).toBe(
      "MockModerationRepository",
    );
  });
});
