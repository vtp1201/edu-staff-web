import { describe, expect, it } from "vitest";
import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import { evaluateAdminAccess, evaluateNamespaceAccess } from "./role-guard";

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

/**
 * Generic namespace guard (INFRA rsc-layout-guards-role-groups, ADR 0063
 * follow-up). Sweeps every namespace × every forged (wrong) role — mirrors
 * the ADR 0063 §Testability contract's "sweep every forbidden role" shape,
 * applied at the route-layout boundary rather than the repository boundary.
 */
describe("evaluateNamespaceAccess (generic — powers every role namespace layout)", () => {
  const ALL_ROLES: readonly UserRole[] = [
    "teacher",
    "principal",
    "student",
    "parent",
    "admin",
  ];

  describe.each(ALL_ROLES)("requiredRole=%s", (requiredRole) => {
    it(`allows role=${requiredRole} with no redirect`, () => {
      const result = evaluateNamespaceAccess(
        requiredRole,
        LOCALE,
        TENANT,
        requiredRole,
      );
      expect(result.verdict).toBe("allowed");
      expect(result.redirectUrl).toBe("");
    });

    it(`denies every forged (wrong) role, redirecting to ITS OWN default route — never renders the ${requiredRole} namespace`, () => {
      for (const forgedRole of ALL_ROLES) {
        if (forgedRole === requiredRole) continue;
        const result = evaluateNamespaceAccess(
          forgedRole,
          LOCALE,
          TENANT,
          requiredRole,
        );
        expect(result.verdict).toBe("redirect-to-default");
        // Must redirect to the FORGED caller's own home, never leak into
        // (or dead-end inside) the namespace they tried to force their way into.
        expect(result.redirectUrl).not.toContain(`/${requiredRole}`);
      }
    });

    it("redirects an absent (unauthenticated) role to select-tenant, deny-by-default", () => {
      const result = evaluateNamespaceAccess(
        null,
        LOCALE,
        TENANT,
        requiredRole,
      );
      expect(result.verdict).toBe("redirect-to-auth");
      expect(result.redirectUrl).toBe(`/${LOCALE}/select-tenant`);
    });
  });

  it("admin default route is namespaced (school-setup), not the bare /admin root", () => {
    const result = evaluateNamespaceAccess("admin", LOCALE, TENANT, "teacher");
    expect(result.redirectUrl).toContain("/admin/school-setup");
  });
});
