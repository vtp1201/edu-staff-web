import { describe, expect, it } from "vitest";
import type { UserTenantRole } from "@/features/auth/domain/entities/auth-user.entity";
import { evaluateTenantAccess } from "./access-guard";
import { hasTenantMembership, rolesInTenant } from "./membership";
import { resolveTenant } from "./resolve-tenant";
import { tenantUrl } from "./tenant-url";

describe("resolveTenant (shape B: /{locale}/t/{tenantId})", () => {
  it("resolves the tenant id from a valid path", () => {
    const t = resolveTenant({ pathname: "/vi/t/tenant-acme/teacher" });
    expect(t).toEqual({ tenantId: "tenant-acme", mode: "path" });
  });

  it("resolves with a deep sub-path", () => {
    const t = resolveTenant({
      pathname: "/en/t/tenant-beta/teacher/attendance",
    });
    expect(t?.tenantId).toBe("tenant-beta");
  });

  it("returns null when the /t/ marker is absent", () => {
    expect(resolveTenant({ pathname: "/vi/teacher" })).toBeNull();
  });

  it("returns null for an unknown locale", () => {
    expect(resolveTenant({ pathname: "/fr/t/tenant-acme" })).toBeNull();
  });

  it("returns null when the tenant id is missing", () => {
    expect(resolveTenant({ pathname: "/vi/t" })).toBeNull();
    expect(resolveTenant({ pathname: "/vi/t/" })).toBeNull();
  });

  it("never resolves via host in phase 1", () => {
    expect(
      resolveTenant({ pathname: "/teacher", host: "acme.eduportal.vn" }),
    ).toBeNull();
  });
});

describe("tenantUrl", () => {
  it("builds a locale-relative tenant path", () => {
    expect(tenantUrl("tenant-acme", "/teacher")).toBe("/t/tenant-acme/teacher");
  });

  it("normalises a path without a leading slash", () => {
    expect(tenantUrl("tenant-acme", "teacher")).toBe("/t/tenant-acme/teacher");
  });

  it("returns the tenant root when no path is given", () => {
    expect(tenantUrl("tenant-acme")).toBe("/t/tenant-acme");
    expect(tenantUrl("tenant-acme", "/")).toBe("/t/tenant-acme");
  });
});

describe("evaluateTenantAccess (claim guard)", () => {
  it("allows when the token's tenant claim matches the URL tenant", () => {
    expect(evaluateTenantAccess("t-1", "t-1")).toBe("allowed");
  });

  it("flags no-active-tenant when the token carries no tenant claim", () => {
    expect(evaluateTenantAccess("t-1", null)).toBe("no-active-tenant");
    expect(evaluateTenantAccess("t-1", undefined)).toBe("no-active-tenant");
  });

  it("flags a mismatch when the token is scoped to another tenant", () => {
    expect(evaluateTenantAccess("t-1", "t-2")).toBe("tenant-mismatch");
  });
});

describe("hasTenantMembership / rolesInTenant", () => {
  const roles: UserTenantRole[] = [
    { role: "teacher", tenantId: "t-acme", tenantName: "Acme" },
    { role: "parent", tenantId: "t-beta", tenantName: "Beta" },
  ];

  it("passes when the user holds a role in the tenant", () => {
    expect(hasTenantMembership(roles, "t-acme")).toBe(true);
  });

  it("blocks when the user has no role in the tenant", () => {
    expect(hasTenantMembership(roles, "t-ghost")).toBe(false);
  });

  it("lists the roles held within a tenant", () => {
    expect(rolesInTenant(roles, "t-acme")).toEqual([
      { role: "teacher", tenantId: "t-acme", tenantName: "Acme" },
    ]);
  });
});
