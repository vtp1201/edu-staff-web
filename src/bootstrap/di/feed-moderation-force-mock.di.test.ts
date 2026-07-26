import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * US-E18.20 AC-1 — `feed.di.ts` and `moderation.di.ts` are PERMANENTLY
 * mock-first: they must resolve the Mock* repository even with
 * `NEXT_PUBLIC_USE_MOCK=false`, because the hold is a domain-model/shape gap in
 * `social`'s real contract, not the app-wide mock toggle (see each factory's
 * doc comment). This is the regression guard for the day that flag flips.
 *
 * Every use-case in both features is exercised, since each calls `makeRepo()`
 * independently — a partial force-mock would silently leak the real repository
 * (and its `createServerHttpClient()` cookie read) into one code path.
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

describe("feed.di / moderation.di — force-mocked regardless of USE_MOCK", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("feed factories resolve MockFeedRepository with USE_MOCK=false", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const di = await import("./feed.di");

    const useCases = await Promise.all([
      di.makeListFeedUseCase(),
      di.makeCreatePostUseCase(),
      di.makeReactToPostUseCase(),
      di.makeListCommentsUseCase(),
      di.makeAddCommentUseCase(),
      di.makeTogglePinMockUseCase(),
    ]);

    for (const useCase of useCases) {
      expect(repoNameOf(useCase)).toBe("MockFeedRepository");
    }
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

  it("both factories still resolve the mock when USE_MOCK is unset entirely", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "");
    const feedDi = await import("./feed.di");
    const modDi = await import("./moderation.di");

    expect(repoNameOf(await feedDi.makeListFeedUseCase())).toBe(
      "MockFeedRepository",
    );
    expect(repoNameOf(await modDi.makeListReportsUseCase())).toBe(
      "MockModerationRepository",
    );
  });
});
