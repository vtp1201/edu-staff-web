/**
 * Unit tests — `makeGetChildAttendanceUseCase()` env matrix.
 *
 * US-E20.5 locked in an honest degrade here (a real environment got
 * `UnavailableChildAttendanceRepository`, rejecting `forbidden` with no HTTP)
 * because the openapi summary said PARENT was not authorized on
 * `GET /members/{memberId}/attendance`. US-E18.34 ground-truthed that against
 * the Go source: `get_student_attendance.go`'s `authorize()` has allowed a
 * PARENT to read a LINKED child since US-047. The degrade is retired and the
 * real branch now issues a real call.
 *
 * What still MUST hold — and what this file locks in — is the mock boundary:
 * fabricated present/late/excused/absent rows for a parent's REAL child may
 * only ever appear when `NEXT_PUBLIC_USE_MOCK === "true"`. With the flag
 * `"false"` or unset the factory must build the HTTP-backed repository, and a
 * BE `ATTENDANCE_FORBIDDEN` (an unlinked child) must reach the screen as a
 * typed `forbidden` — never as invented data.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
  vi.doUnmock("@/bootstrap/di/auth.di");
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

/** Stand in for the Next request scope the real branch needs (`cookies()` is
 *  unavailable outside a request). */
function stubRealSession(
  get: ReturnType<typeof vi.fn> = vi.fn(async () => ({
    memberId: "c1",
    records: [],
  })),
) {
  const createServerHttpClient = vi.fn(async () => ({ get }));
  vi.doMock("@/bootstrap/di/auth.di", () => ({
    ensureFreshSession: vi.fn(async () => {}),
  }));
  vi.doMock("@/bootstrap/lib/http.server", () => ({ createServerHttpClient }));
  return { createServerHttpClient, get };
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
    const { createServerHttpClient } = stubRealSession();
    const useCase = await makeWithEnv("true");
    expect(repoOf(useCase).constructor.name).toBe(
      "MockChildAttendanceRepository",
    );

    const result = await useCase.execute("c1", RANGE);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.length).toBeGreaterThan(0);
    // the mock branch must not open a session/HTTP client at all
    expect(createServerHttpClient).not.toHaveBeenCalled();
  });

  for (const value of [undefined, "false"] as const) {
    it(`calls the REAL endpoint — never the mock — when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      const { createServerHttpClient, get } = stubRealSession(
        vi.fn(async () => ({
          memberId: "c1",
          records: [
            { date: "2026-08-03", classId: "cls-1", status: "PRESENT" },
          ],
        })),
      );
      const useCase = await makeWithEnv(value);
      expect(repoOf(useCase).constructor.name).toBe(
        "ChildAttendanceRepository",
      );

      const result = await useCase.execute("c1", RANGE);

      expect(createServerHttpClient).toHaveBeenCalledTimes(1);
      expect(get).toHaveBeenCalledWith("/core/api/v1/members/c1/attendance", {
        params: RANGE,
      });
      expect(result).toEqual({
        ok: true,
        data: [{ date: "2026-08-03", status: "present" }],
      });
    });

    it(`surfaces an unlinked child as a typed forbidden — no fabricated rows — when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      stubRealSession(
        vi.fn(async () => {
          // Imported lazily: `vi.resetModules()` hands the repository a FRESH
          // `api-envelope` module, and `isApiError` is an `instanceof` check —
          // a top-level import here would be a different class identity and
          // silently degrade to the `unknown` fallback.
          const { ApiError } = await import("@/bootstrap/lib/api-envelope");
          throw new ApiError({
            code: "ATTENDANCE_FORBIDDEN",
            message: "…",
            retryable: false,
            status: 403,
          });
        }),
      );
      const useCase = await makeWithEnv(value);

      const result = await useCase.execute("c1", RANGE);
      expect(result).toEqual({ ok: false, error: { type: "forbidden" } });
    });
  }

  it("validates the range client-side FIRST — an inverted range never reaches HTTP", async () => {
    const { get } = stubRealSession();
    const useCase = await makeWithEnv("false");

    const result = await useCase.execute("c1", {
      startDate: "2026-08-31",
      endDate: "2026-08-01",
    });

    expect(result).toEqual({
      ok: false,
      error: { type: "invalid-date-range" },
    });
    expect(get).not.toHaveBeenCalled();
  });
});
