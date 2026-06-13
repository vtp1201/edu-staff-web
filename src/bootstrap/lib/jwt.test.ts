import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decodeJwtExp,
  decodeRoleClaim,
  decodeTenantId,
  isAccessExpired,
} from "./jwt";

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

describe("decodeTenantId", () => {
  it("reads the tenantId claim from a tenant-scoped token", () => {
    expect(decodeTenantId(makeJwt({ tenantId: "t-acme" }))).toBe("t-acme");
  });

  it("returns null when there is no tenantId claim", () => {
    expect(decodeTenantId(makeJwt({ exp: 1 }))).toBeNull();
  });

  it("returns null for a malformed token", () => {
    expect(decodeTenantId("nope")).toBeNull();
  });
});

describe("decodeRoleClaim", () => {
  const b64url = (payload: Record<string, unknown>): string =>
    btoa(JSON.stringify(payload))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  const makeToken = (payload: Record<string, unknown>): string =>
    `eyJhbGciOiJIUzI1NiJ9.${b64url(payload)}.fakesig`;

  const adminToken = makeToken({
    role: "admin",
    tenantId: "t-1",
    exp: 9999999999,
  });
  const teacherToken = makeToken({
    role: "teacher",
    tenantId: "t-1",
    exp: 9999999999,
  });
  const memberRolesToken = makeToken({
    memberRoles: ["principal"],
    exp: 9999999999,
  });
  const unknownRoleToken = makeToken({ role: "superhero" });
  const malformedToken = "not.a.jwt";

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 'admin' for a token with role: 'admin' (mock=false)", () => {
    expect(decodeRoleClaim(adminToken)).toBe("admin");
  });

  it("returns 'teacher' for a token with role: 'teacher'", () => {
    expect(decodeRoleClaim(teacherToken)).toBe("teacher");
  });

  it("returns 'principal' from memberRoles[0] when role is absent", () => {
    expect(decodeRoleClaim(memberRolesToken)).toBe("principal");
  });

  it("returns null for an unknown role value", () => {
    expect(decodeRoleClaim(unknownRoleToken)).toBeNull();
  });

  it("returns null for a malformed token", () => {
    expect(decodeRoleClaim(malformedToken)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(decodeRoleClaim("")).toBeNull();
  });

  it("returns 'admin' when mock flag is on for any non-empty string", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "true");
    expect(decodeRoleClaim("anything")).toBe("admin");
    expect(decodeRoleClaim(teacherToken)).toBe("admin");
  });

  it("returns null when mock flag is on but token is empty", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "true");
    expect(decodeRoleClaim("")).toBeNull();
  });
});
