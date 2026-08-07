/**
 * Unit tests — `makeGetContactsUseCase()` wiring (US-E18.52, IAM ADR 0129).
 *
 * The contact picker is the one messaging flow that spans TWO services: rooms/
 * messages come from `social`, but the people directory is `iam`. This is the
 * env matrix for the `USE_MOCK` gate plus proof that the composed IAM port is
 * actually wired with the pinned role filter + the token-derived tenant id, and
 * that mock mode still never touches http/IAM/the token.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("@/bootstrap/lib/http.server");
  vi.doUnmock("@/bootstrap/di/auth.di");
  vi.doUnmock("@/bootstrap/di/iam-directory.di");
  vi.doUnmock("@/bootstrap/lib/auth-token.server");
  vi.doUnmock("@/bootstrap/lib/jwt");
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
});

/** Stub the server-only seams the real branch touches (cookies / session / IAM). */
function stubServerSeams(directoryRows: unknown[] = []) {
  const get = vi.fn().mockRejectedValue(new Error("no http in this test"));
  const post = vi.fn().mockRejectedValue(new Error("no http in this test"));
  const createServerHttpClient = vi.fn().mockResolvedValue({ get, post });
  const ensureFreshSession = vi.fn().mockResolvedValue(undefined);
  const execute = vi.fn().mockResolvedValue({ ok: true, value: directoryRows });
  const makeSearchMembersUseCase = vi.fn().mockResolvedValue({ execute });
  const getAccessToken = vi.fn().mockResolvedValue("jwt-token");
  const decodeTenantId = vi.fn().mockReturnValue("tenant-42");
  const decodeSubClaim = vi.fn().mockReturnValue("user-self");

  vi.doMock("@/bootstrap/lib/http.server", () => ({ createServerHttpClient }));
  vi.doMock("@/bootstrap/di/auth.di", () => ({ ensureFreshSession }));
  vi.doMock("@/bootstrap/di/iam-directory.di", () => ({
    makeSearchMembersUseCase,
  }));
  vi.doMock("@/bootstrap/lib/auth-token.server", () => ({ getAccessToken }));
  vi.doMock("@/bootstrap/lib/jwt", () => ({ decodeTenantId, decodeSubClaim }));

  return {
    createServerHttpClient,
    ensureFreshSession,
    execute,
    getAccessToken,
  };
}

async function makeWithEnv(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  const { makeGetContactsUseCase } = await import("./messaging.di");
  return makeGetContactsUseCase();
}

describe("makeGetContactsUseCase (contact picker)", () => {
  it("serves the mock contacts when NEXT_PUBLIC_USE_MOCK=true (unchanged)", async () => {
    const { createServerHttpClient, getAccessToken } = stubServerSeams();
    const useCase = await makeWithEnv("true");

    const res = await useCase.execute();

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.length).toBeGreaterThan(0);
    expect(createServerHttpClient).not.toHaveBeenCalled();
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  for (const value of [undefined, "false"] as const) {
    it(`reads the REAL IAM directory when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      const { execute } = stubServerSeams([
        { memberId: "u-1", userId: "u-1", displayName: "Lê Thị Hoa" },
      ]);
      const useCase = await makeWithEnv(value);

      const res = await useCase.execute();

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value).toEqual([
        expect.objectContaining({
          id: "u-1",
          name: "Lê Thị Hoa",
          roleKey: "teacher",
        }),
      ]);
      expect(execute).toHaveBeenCalledOnce();
    });
  }

  it("pins an ALLOWED role filter (ADR 0129: ADMIN|MANAGER|TEACHER|STAFF) + the token-derived tenant id", async () => {
    // A narrowed-tier caller (STUDENT/PARENT) gets 403
    // `member_list_role_filter_required` when `role=` is missing or is
    // STUDENT/PARENT — so the filter is not optional decoration here.
    const { execute } = stubServerSeams();
    const useCase = await makeWithEnv("false");

    await useCase.execute();

    expect(execute).toHaveBeenCalledExactlyOnceWith({
      tenantId: "tenant-42",
      role: "TEACHER",
    });
  });

  it("refreshes the session before building the real client (decision 0018)", async () => {
    const { ensureFreshSession } = stubServerSeams();
    await makeWithEnv("false");
    expect(ensureFreshSession).toHaveBeenCalled();
  });
});
