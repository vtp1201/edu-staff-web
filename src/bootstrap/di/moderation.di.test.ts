/**
 * Unit tests — `moderation.di.ts` env matrix (US-E18.32).
 *
 * The moderation factory stopped being unconditionally force-mocked (US-E18.20)
 * once BE US-172/US-166 added the queue filters, the stats endpoint, the report
 * detail point-read and the COMMENT target:
 *
 * - `NEXT_PUBLIC_USE_MOCK="true"` → the pure `MockModerationRepository`.
 * - flag `"false"` or unset → the real `ModerationRepository` (the audit-log
 *   read degrades inside it; there is no mock fallback and no hybrid).
 *
 * Every factory is exercised because each calls `makeRepo()` independently — a
 * partial swap would leak one path back to the mock (or the real repo, and its
 * `createServerHttpClient()` cookie read).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

beforeEach(() => {
  vi.resetModules();
  vi.doMock("@/bootstrap/lib/http.server", () => ({
    createServerHttpClient: vi.fn().mockResolvedValue({}),
  }));
  vi.doMock("@/bootstrap/di/auth.di", () => ({
    ensureFreshSession: vi.fn().mockResolvedValue(undefined),
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
  return import("./moderation.di");
}

async function allUseCases(value: string | undefined) {
  const di = await importDiWithEnv(value);
  return Promise.all([
    di.makeSubmitReportUseCase(),
    di.makeListReportsUseCase(),
    di.makeDismissReportUseCase(),
    di.makeRemoveContentUseCase(),
    di.makeGetModerationAuditLogUseCase(),
  ]);
}

describe("moderation.di — USE_MOCK ? Mock : Real", () => {
  it('every factory resolves MockModerationRepository when NEXT_PUBLIC_USE_MOCK="true"', async () => {
    for (const useCase of await allUseCases("true")) {
      expect(repoOf(useCase).constructor.name).toBe("MockModerationRepository");
    }
    const di = await importDiWithEnv("true");
    expect((await di.makeModerationRepository()).constructor.name).toBe(
      "MockModerationRepository",
    );
  });

  for (const value of [undefined, "false"] as const) {
    it(`every factory resolves ModerationRepository when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      for (const useCase of await allUseCases(value)) {
        expect(repoOf(useCase).constructor.name).toBe("ModerationRepository");
      }
      // The bare-repository escape hatch (detail sheet + stats) too.
      const di = await importDiWithEnv(value);
      expect((await di.makeModerationRepository()).constructor.name).toBe(
        "ModerationRepository",
      );
    });
  }

  it("never creates a server http client in mock mode", async () => {
    const createServerHttpClient = vi.fn().mockResolvedValue({});
    vi.doMock("@/bootstrap/lib/http.server", () => ({
      createServerHttpClient,
    }));
    await allUseCases("true");
    expect(createServerHttpClient).not.toHaveBeenCalled();
  });

  it("refreshes the session BEFORE creating the http client in real mode", async () => {
    const calls: string[] = [];
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
    const di = await importDiWithEnv("false");
    await di.makeListReportsUseCase();
    expect(calls).toEqual(["refresh", "http"]);
  });
});
