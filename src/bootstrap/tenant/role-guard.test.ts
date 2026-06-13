import { describe, expect, it } from "vitest";
import { evaluateAdminAccess } from "./role-guard";

const LOCALE = "vi";
const TENANT = "t-acme";

describe("evaluateAdminAccess", () => {
  it("allows an admin role with no redirect", () => {
    const result = evaluateAdminAccess("admin", LOCALE, TENANT);
    expect(result.verdict).toBe("allowed");
    expect(result.redirectUrl).toBe("");
  });

  it("redirects a teacher to their default route", () => {
    const result = evaluateAdminAccess("teacher", LOCALE, TENANT);
    expect(result.verdict).toBe("redirect-to-default");
    expect(result.redirectUrl).toContain("/teacher");
  });

  it("redirects a principal to their default route", () => {
    const result = evaluateAdminAccess("principal", LOCALE, TENANT);
    expect(result.verdict).toBe("redirect-to-default");
    expect(result.redirectUrl).toContain("/principal");
  });

  it("redirects a student to their default route", () => {
    const result = evaluateAdminAccess("student", LOCALE, TENANT);
    expect(result.verdict).toBe("redirect-to-default");
    expect(result.redirectUrl).toContain("/student");
  });

  it("redirects a parent to their default route", () => {
    const result = evaluateAdminAccess("parent", LOCALE, TENANT);
    expect(result.verdict).toBe("redirect-to-default");
    expect(result.redirectUrl).toContain("/parent");
  });

  it("redirects a null role to select-tenant auth", () => {
    const result = evaluateAdminAccess(null, LOCALE, TENANT);
    expect(result.verdict).toBe("redirect-to-auth");
    expect(result.redirectUrl).toContain("/select-tenant");
  });

  it("includes the locale prefix and tenantId for a non-admin redirect", () => {
    const result = evaluateAdminAccess("teacher", LOCALE, TENANT);
    expect(result.redirectUrl).toContain(`/${LOCALE}`);
    expect(result.redirectUrl).toContain(TENANT);
  });
});
