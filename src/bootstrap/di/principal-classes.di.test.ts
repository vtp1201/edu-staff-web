/**
 * Unit tests — `makePrincipalClassesRepository()` (US-E13.8, un-mocked
 * US-E18.30).
 *
 * This factory used to be UNCONDITIONALLY mock-backed, because `core`'s
 * `ListClassesUseCase` 403'd for MANAGER (the principal `appRole`). BE US-164
 * added a `roleManager` branch granting tenant-wide read on that very use case
 * (ground-truthed in `list_classes.go`), so the factory is now the plain
 * `USE_MOCK ? Mock : Real` gate every other DI factory uses (decision 0014).
 * These tests are the env matrix for that gate.
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

/** Stub the server-only seams the real branch touches (cookies / session). */
function stubServerSeams() {
  const createServerHttpClient = vi.fn().mockResolvedValue({ get: vi.fn() });
  const ensureFreshSession = vi.fn().mockResolvedValue(undefined);
  vi.doMock("@/bootstrap/lib/http.server", () => ({ createServerHttpClient }));
  vi.doMock("@/bootstrap/di/auth.di", () => ({ ensureFreshSession }));
  return { createServerHttpClient, ensureFreshSession };
}

async function makeWithEnv(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  const { makePrincipalClassesRepository } = await import(
    "./principal-classes.di"
  );
  return makePrincipalClassesRepository();
}

describe("makePrincipalClassesRepository", () => {
  it("returns the mock repository when NEXT_PUBLIC_USE_MOCK=true", async () => {
    const repo = await makeWithEnv("true");
    // `vi.resetModules()` gives each import a fresh class identity, so
    // compare the constructor name rather than using `instanceof`.
    expect(repo.constructor.name).toBe("MockClassManagementRepository");
  });

  for (const value of [undefined, "false"] as const) {
    it(`returns the REAL repository when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      const { createServerHttpClient } = stubServerSeams();
      const repo = await makeWithEnv(value);
      expect(repo.constructor.name).toBe("ClassManagementRepository");
      expect(createServerHttpClient).toHaveBeenCalledTimes(1);
    });
  }

  it("refreshes the session before building the real client", async () => {
    const { ensureFreshSession } = stubServerSeams();
    await makeWithEnv("false");
    expect(ensureFreshSession).toHaveBeenCalledTimes(1);
  });

  it("never creates a server http client in mock mode", async () => {
    const { createServerHttpClient } = stubServerSeams();
    await makeWithEnv("true");
    expect(createServerHttpClient).not.toHaveBeenCalled();
  });

  it("serves seed rows with real studentCount/homeroom in mock mode (FR-002)", async () => {
    const repo = await makeWithEnv("true");
    const res = await repo.listClasses({
      academicYear: "2025-2026",
      limit: 100,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.data.length).toBeGreaterThan(0);
      expect(res.value.data.some((c) => c.studentCount > 0)).toBe(true);
      expect(res.value.data.some((c) => c.homeroomTeacherName !== null)).toBe(
        true,
      );
    }
  });
});
