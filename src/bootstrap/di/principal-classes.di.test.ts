/**
 * Unit tests — `makePrincipalClassesRepository()` (US-E13.8).
 *
 * The whole point of this factory is that it is NOT gated by
 * `NEXT_PUBLIC_USE_MOCK`: `core`'s `ListClassesUseCase` 403s for MANAGER
 * (principal), so a real call can never succeed. These tests lock that in —
 * mock-backed with the env var unset, `"false"` and `"true"` alike — so a
 * future "fix" that reintroduces a `USE_MOCK` branch fails here instead of
 * silently 403ing every principal in production.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
});

async function makeWithEnv(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  const { makePrincipalClassesRepository } = await import(
    "./principal-classes.di"
  );
  return makePrincipalClassesRepository();
}

describe("makePrincipalClassesRepository", () => {
  for (const value of [undefined, "false", "true"] as const) {
    it(`returns the mock repository when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      const repo = await makeWithEnv(value);
      // `vi.resetModules()` gives each import a fresh class identity, so
      // compare the constructor name rather than using `instanceof`.
      expect(repo.constructor.name).toBe("MockClassManagementRepository");
    });
  }

  it("serves real seed rows (never a forbidden failure) regardless of env", async () => {
    const repo = await makeWithEnv("false");
    const res = await repo.listClasses({
      academicYear: "2025-2026",
      limit: 100,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.data.length).toBeGreaterThan(0);
      // FR-002: real (non-hardcoded) studentCount/homeroom, unlike
      // IPrincipalTeachersRepository.listClasses()'s documented known gap.
      expect(res.value.data.some((c) => c.studentCount > 0)).toBe(true);
      expect(res.value.data.some((c) => c.homeroomTeacherName !== null)).toBe(
        true,
      );
    }
  });

  it("never creates a server http client (no real call is ever attempted)", async () => {
    const createServerHttpClient = vi.fn();
    vi.doMock("@/bootstrap/lib/http.server", () => ({
      createServerHttpClient,
    }));
    process.env.NEXT_PUBLIC_USE_MOCK = "false";
    const { makePrincipalClassesRepository } = await import(
      "./principal-classes.di"
    );
    await makePrincipalClassesRepository();
    expect(createServerHttpClient).not.toHaveBeenCalled();
    vi.doUnmock("@/bootstrap/lib/http.server");
  });
});
