import { describe, expect, it } from "vitest";
import { decodeJwtExp, isAccessExpired } from "./jwt";

function makeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.sig`;
}

describe("decodeJwtExp", () => {
  it("reads the exp claim", () => {
    expect(decodeJwtExp(makeJwt({ exp: 1700000000 }))).toBe(1700000000);
  });

  it("returns null for malformed token", () => {
    expect(decodeJwtExp("not-a-jwt")).toBeNull();
    expect(decodeJwtExp("a.b")).toBeNull();
  });

  it("returns null when exp is missing or non-numeric", () => {
    expect(decodeJwtExp(makeJwt({ sub: "x" }))).toBeNull();
    expect(decodeJwtExp(makeJwt({ exp: "soon" }))).toBeNull();
  });
});

describe("isAccessExpired", () => {
  const now = 1_000_000 * 1000; // nowMs

  it("treats null exp as expired", () => {
    expect(isAccessExpired(null, 30, now)).toBe(true);
  });

  it("is expired when within the skew window", () => {
    // exp 20s ahead, skew 30s → considered expired
    expect(isAccessExpired(1_000_020, 30, now)).toBe(true);
  });

  it("is valid when comfortably ahead of skew", () => {
    expect(isAccessExpired(1_000_060, 30, now)).toBe(false);
  });
});
