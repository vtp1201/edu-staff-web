/**
 * Unit tests — `makeGetMemberTimetableForPrincipalUseCase()` (US-E18.38).
 *
 * This factory used to be force-mocked unconditionally: `core`'s
 * `get_member_timetable.go` `authorize()` had no `MANAGER` branch, so a
 * principal's by-member read was a hard 403 that the repository mapped to
 * `not-found` → a silent permanent empty state. BE **US-175** added
 * `hasRole(ActorRoles, roleManager)` to that `authorize()` (admin-tier READ
 * only, `shared.go`'s `roleManager`), closing cross-repo ask #43. The factory is
 * therefore now an ordinary `USE_MOCK ? Mock : Real` gate like every sibling.
 *
 * These tests lock the gate in BOTH directions — mock under `USE_MOCK=true`,
 * real (hybrid) under unset/`"false"` — and assert PARITY with an authorized
 * sibling (`makeGetChildTimetableUseCase`), so the principal path can never
 * silently drift back onto mock data in production.
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
});

/**
 * `vi.resetModules()` gives every import a fresh class identity, so `instanceof`
 * is useless here. Each use-case holds its repository as its ONLY object-valued
 * field — read it back and compare the constructor name.
 */
function repoOf(useCase: object): { constructor: { name: string } } {
  const objects = Object.values(useCase).filter(
    (v) => typeof v === "object" && v !== null,
  );
  expect(objects).toHaveLength(1);
  return objects[0];
}

async function importDiWithEnv(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  return import("./timetable-view.di");
}

/** Stubs the server-only edges `makeRepo()` touches on its real branch. */
function stubRealEdges() {
  const createServerHttpClient = vi.fn(async () => ({}));
  vi.doMock("@/bootstrap/lib/http.server", () => ({ createServerHttpClient }));
  vi.doMock("@/bootstrap/lib/auth-token.server", () => ({
    getAccessToken: async () => null,
  }));
  vi.doMock("@/bootstrap/di/auth.di", () => ({
    ensureFreshSession: async () => undefined,
  }));
  return { createServerHttpClient };
}

describe("makeGetMemberTimetableForPrincipalUseCase", () => {
  it("is mock-backed when NEXT_PUBLIC_USE_MOCK=true", async () => {
    const { createServerHttpClient } = stubRealEdges();
    const di = await importDiWithEnv("true");
    const useCase = await di.makeGetMemberTimetableForPrincipalUseCase();
    expect(repoOf(useCase).constructor.name).toBe(
      "MockWeeklyTimetableRepository",
    );
    expect(createServerHttpClient).not.toHaveBeenCalled();
  });

  for (const value of [undefined, "false"] as const) {
    it(`is real (hybrid) when NEXT_PUBLIC_USE_MOCK=${String(value)} — BE US-175 grants MANAGER`, async () => {
      const { createServerHttpClient } = stubRealEdges();
      const di = await importDiWithEnv(value);
      const useCase = await di.makeGetMemberTimetableForPrincipalUseCase();
      expect(repoOf(useCase).constructor.name).toBe(
        "HybridWeeklyTimetableRepository",
      );
      expect(createServerHttpClient).toHaveBeenCalled();
    });
  }

  it("resolves the SAME repository as an authorized sibling factory (no bespoke gate left)", async () => {
    stubRealEdges();
    const di = await importDiWithEnv("false");
    const principal = await di.makeGetMemberTimetableForPrincipalUseCase();
    const child = await di.makeGetChildTimetableUseCase();
    expect(repoOf(principal).constructor.name).toBe(
      repoOf(child).constructor.name,
    );
  });

  it("still serves a mock week end-to-end under USE_MOCK=true (zero regression)", async () => {
    const di = await importDiWithEnv("true");
    const useCase = await di.makeGetMemberTimetableForPrincipalUseCase();
    const res = await useCase.execute("t-001");
    expect(res.ok).toBe(true);
  });
});
