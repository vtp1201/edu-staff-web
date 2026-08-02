/**
 * Unit tests — `makeGetChildAttendanceUseCase()` env matrix (US-E20.5 fix round).
 *
 * The MUST-FIX this file locks in: the factory must only serve MOCK attendance
 * when `NEXT_PUBLIC_USE_MOCK === "true"`. With the flag `"false"` or unset (a
 * real/production environment) a parent must NOT be shown fabricated
 * present/late/excused/absent rows for their real child — the factory returns
 * the unavailable repository instead, which rejects `{ type: "forbidden" }` and
 * degrades the screen to the honest "not available yet" state.
 *
 * There is no real HTTP path for this feature at all (PARENT is absent from the
 * authorization list of `GET /members/{memberId}/attendance`), so the last test
 * asserts `createServerHttpClient` is never constructed in ANY of the three
 * states.
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
});

const RANGE = { startDate: "2026-08-01", endDate: "2026-08-31" };

/**
 * `vi.resetModules()` gives every import a fresh class identity, so `instanceof`
 * is useless here. The use-case holds its repository as its ONLY object-valued
 * field — read it back and compare the constructor name.
 */
function repoOf(useCase: object): { constructor: { name: string } } {
  const objects = Object.values(useCase).filter(
    (v) => typeof v === "object" && v !== null,
  );
  expect(objects).toHaveLength(1);
  return objects[0];
}

async function makeWithEnv(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  const { makeGetChildAttendanceUseCase } = await import(
    "./parent-attendance.di"
  );
  return makeGetChildAttendanceUseCase();
}

describe("makeGetChildAttendanceUseCase", () => {
  it('serves mock records only when NEXT_PUBLIC_USE_MOCK="true"', async () => {
    const useCase = await makeWithEnv("true");
    expect(repoOf(useCase).constructor.name).toBe(
      "MockChildAttendanceRepository",
    );

    const result = await useCase.execute("c1", RANGE);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.length).toBeGreaterThan(0);
  });

  for (const value of [undefined, "false"] as const) {
    it(`degrades to a forbidden failure — never fabricated rows — when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      const useCase = await makeWithEnv(value);
      expect(repoOf(useCase).constructor.name).toBe(
        "UnavailableChildAttendanceRepository",
      );

      const result = await useCase.execute("c1", RANGE);
      expect(result).toEqual({ ok: false, error: { type: "forbidden" } });
    });
  }

  for (const value of [undefined, "false", "true"] as const) {
    it(`never creates a server http client when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      const createServerHttpClient = vi.fn();
      vi.doMock("@/bootstrap/lib/http.server", () => ({
        createServerHttpClient,
      }));
      const useCase = await makeWithEnv(value);
      // Also exercise the call path — not just the factory.
      await useCase.execute("c1", RANGE);
      expect(createServerHttpClient).not.toHaveBeenCalled();
    });
  }
});
