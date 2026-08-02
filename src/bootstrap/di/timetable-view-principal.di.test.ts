/**
 * Unit tests — `makeGetMemberTimetableForPrincipalUseCase()` (US-E15.3 fix round).
 *
 * `core`'s `GetMemberTimetableUseCase.authorize()` grants SUPER_ADMIN/ADMIN, the
 * target member itself, and a verified linked PARENT — `MANAGER` (the principal
 * `appRole`) is in NO branch, so the principal's by-member read is a hard 403.
 * The principal factory is therefore force-mocked. (It used to share that
 * posture with `makePrincipalClassesRepository()`; that one went REAL in
 * US-E18.30 once BE US-164 added `MANAGER` to `ListClassesUseCase` — no
 * equivalent branch was added to `get_member_timetable.go`'s `authorize()`,
 * re-verified US-E18.30.) These tests lock that in — mock
 * with `NEXT_PUBLIC_USE_MOCK` unset, `"false"` and `"true"` alike — so a future
 * "fix" that reintroduces a `USE_MOCK` branch fails here instead of silently
 * rendering a permanent empty state for every teacher in production.
 *
 * The sibling factories (student self / teacher self / parent child) ARE
 * authorized by that same Go function, so they must stay real-capable; the last
 * test guards against an over-eager force-mock spreading across the file.
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

describe("makeGetMemberTimetableForPrincipalUseCase", () => {
  for (const value of [undefined, "false", "true"] as const) {
    it(`is mock-backed when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      const di = await importDiWithEnv(value);
      const useCase = await di.makeGetMemberTimetableForPrincipalUseCase();
      expect(repoOf(useCase).constructor.name).toBe(
        "MockWeeklyTimetableRepository",
      );
    });
  }

  it("never creates a server http client (no real 403-bound call is attempted)", async () => {
    const createServerHttpClient = vi.fn();
    vi.doMock("@/bootstrap/lib/http.server", () => ({
      createServerHttpClient,
    }));
    const di = await importDiWithEnv("false");
    await di.makeGetMemberTimetableForPrincipalUseCase();
    expect(createServerHttpClient).not.toHaveBeenCalled();
  });

  it("serves a real week (never a failure) regardless of env", async () => {
    const di = await importDiWithEnv("false");
    const useCase = await di.makeGetMemberTimetableForPrincipalUseCase();
    const res = await useCase.execute("t-001");
    expect(res.ok).toBe(true);
  });

  it("leaves the authorized sibling paths real-capable", async () => {
    const createServerHttpClient = vi.fn(async () => ({}));
    vi.doMock("@/bootstrap/lib/http.server", () => ({
      createServerHttpClient,
    }));
    vi.doMock("@/bootstrap/lib/auth-token.server", () => ({
      getAccessToken: async () => null,
    }));
    vi.doMock("@/bootstrap/di/auth.di", () => ({
      ensureFreshSession: async () => undefined,
    }));

    const di = await importDiWithEnv("false");
    const childUseCase = await di.makeGetChildTimetableUseCase();
    expect(repoOf(childUseCase).constructor.name).toBe(
      "HybridWeeklyTimetableRepository",
    );
    expect(createServerHttpClient).toHaveBeenCalled();
  });
});
