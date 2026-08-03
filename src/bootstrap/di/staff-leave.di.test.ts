/**
 * Unit tests — `makeStaffLeaveRepository()` env matrix (US-E18.36).
 *
 * This factory was UNCONDITIONALLY mock-backed (US-E18.8) because the wire
 * had no tenant-wide list, no name lookup and no `department`/`leaveType`.
 * core US-149 + IAM US-144 + core US-170 closed all three, so it is now the
 * plain `USE_MOCK ? Mock : Real` gate (decision 0014). `USE_MOCK` is FALSE
 * when the env var is unset — the unset case is therefore a REAL-mode case
 * and is asserted as such.
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
  const createServerHttpClient = vi
    .fn()
    .mockResolvedValue({ get: vi.fn(), post: vi.fn() });
  const ensureFreshSession = vi.fn().mockResolvedValue(undefined);
  vi.doMock("@/bootstrap/lib/http.server", () => ({ createServerHttpClient }));
  vi.doMock("@/bootstrap/di/auth.di", () => ({ ensureFreshSession }));
  return { createServerHttpClient, ensureFreshSession };
}

async function makeWithEnv(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  const { makeStaffLeaveRepository } = await import("./staff-leave.di");
  return makeStaffLeaveRepository();
}

describe("makeStaffLeaveRepository", () => {
  it("returns the mock repository when NEXT_PUBLIC_USE_MOCK=true", async () => {
    const repo = await makeWithEnv("true");
    // `vi.resetModules()` gives each import a fresh class identity, so compare
    // the constructor name rather than using `instanceof`.
    expect(repo.constructor.name).toBe("MockStaffLeaveRepository");
  });

  for (const value of [undefined, "false"] as const) {
    it(`returns the REAL repository when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      const { createServerHttpClient } = stubServerSeams();
      const repo = await makeWithEnv(value);
      expect(repo.constructor.name).toBe("StaffLeaveRepository");
      // Once for core's http client, once for the composed IAM directory repo.
      expect(createServerHttpClient).toHaveBeenCalledTimes(2);
    });
  }

  it("refreshes the session before building the real client", async () => {
    const { ensureFreshSession } = stubServerSeams();
    await makeWithEnv("false");
    expect(ensureFreshSession).toHaveBeenCalled();
  });

  it("never creates a server http client in mock mode", async () => {
    const { createServerHttpClient } = stubServerSeams();
    await makeWithEnv("true");
    expect(createServerHttpClient).not.toHaveBeenCalled();
  });

  it("mock mode still serves seeded rows, including one with BOTH US-170 nulls", async () => {
    const repo = await makeWithEnv("true");
    const res = await repo.listRequests();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.length).toBeGreaterThan(0);
      const nullish = res.value.filter(
        (r) => r.department === null && r.leaveType === null,
      );
      expect(nullish).toHaveLength(1);
      // …and the rest are still fully populated (the nulls are not global).
      expect(
        res.value.some((r) => r.department !== null && r.leaveType !== null),
      ).toBe(true);
    }
  });
});
