/**
 * `resolveMyClassId()` — US-E24.1. The whole point of the helper is that it
 * NEVER guesses: an unresolvable class must be `null`, never a stale or
 * someone-else's id, because every downstream `lms` read is class-scoped.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

const getAccessToken = vi.fn<() => Promise<string | null>>();
const httpGet = vi.fn();

beforeEach(() => {
  vi.resetModules();
  getAccessToken.mockReset();
  httpGet.mockReset();
  vi.doMock("@/bootstrap/lib/auth-token.server", () => ({ getAccessToken }));
  vi.doMock("@/bootstrap/lib/http.server", () => ({
    createServerHttpClient: vi.fn(async () => ({ get: httpGet })),
  }));
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
  vi.doUnmock("@/bootstrap/lib/auth-token.server");
  vi.doUnmock("@/bootstrap/lib/http.server");
});

/** Minimal unsigned JWT carrying the given claims. */
function tokenWith(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none" })}.${b64(claims)}.sig`;
}

async function importFresh(useMock: string | undefined) {
  if (useMock === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = useMock;
  return import("./resolve-my-class");
}

describe("mock mode", () => {
  it("returns the seeded class and never touches the network", async () => {
    const { resolveMyClassId } = await importFresh("true");
    const { MOCK_CLASS_ID } = await import(
      "@/features/lms/infrastructure/repositories/mocks/lms.fixtures"
    );

    await expect(resolveMyClassId()).resolves.toBe(MOCK_CLASS_ID);
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(httpGet).not.toHaveBeenCalled();
  });
});

describe("real mode", () => {
  it("reads the `memberId` claim (decision 0074) and returns the enrolled class", async () => {
    getAccessToken.mockResolvedValue(
      tokenWith({ sub: "user-1", memberId: "mem-1" }),
    );
    httpGet.mockResolvedValue({ classId: "cl-9", className: "9A1" });

    const { resolveMyClassId } = await importFresh("false");
    await expect(resolveMyClassId()).resolves.toBe("cl-9");
    expect(httpGet).toHaveBeenCalledWith(
      "/core/api/v1/members/mem-1/enrollment",
    );
  });

  it("returns null with no token at all", async () => {
    getAccessToken.mockResolvedValue(null);
    const { resolveMyClassId } = await importFresh("false");

    await expect(resolveMyClassId()).resolves.toBeNull();
    expect(httpGet).not.toHaveBeenCalled();
  });

  it("returns null when the enrollment read is denied (403) — never a guess", async () => {
    getAccessToken.mockResolvedValue(tokenWith({ memberId: "mem-1" }));
    httpGet.mockRejectedValue(new Error("ROSTER_ACCESS_FORBIDDEN"));

    const { resolveMyClassId } = await importFresh("false");
    await expect(resolveMyClassId()).resolves.toBeNull();
  });

  it("returns null when the payload carries no usable classId", async () => {
    getAccessToken.mockResolvedValue(tokenWith({ memberId: "mem-1" }));
    const { resolveMyClassId } = await importFresh("false");

    httpGet.mockResolvedValue({});
    await expect(resolveMyClassId()).resolves.toBeNull();

    httpGet.mockResolvedValue({ classId: "" });
    await expect(resolveMyClassId()).resolves.toBeNull();
  });
});
