import { describe, expect, it } from "vitest";
import type { UserTenantRole } from "@/features/auth/domain/entities/auth-user.entity";
import { hasTenantMembership, rolesInTenant } from "./membership";
import { resolveTenant } from "./resolve-tenant";
import { tenantUrl } from "./tenant-url";

describe("resolveTenant (shape B: /{locale}/t/{slug})", () => {
  it("resolves the slug from a valid path", () => {
    const t = resolveTenant({ pathname: "/vi/t/acme/teacher" });
    expect(t).toEqual({ slug: "acme", mode: "path", tenantId: null });
  });

  it("resolves with a deep sub-path", () => {
    const t = resolveTenant({ pathname: "/en/t/beta/teacher/attendance" });
    expect(t?.slug).toBe("beta");
  });

  it("returns null when the /t/ marker is absent", () => {
    expect(resolveTenant({ pathname: "/vi/teacher" })).toBeNull();
  });

  it("returns null for an unknown locale", () => {
    expect(resolveTenant({ pathname: "/fr/t/acme/teacher" })).toBeNull();
  });

  it("returns null when the slug is missing", () => {
    expect(resolveTenant({ pathname: "/vi/t" })).toBeNull();
    expect(resolveTenant({ pathname: "/vi/t/" })).toBeNull();
  });

  it("returns null for the bare locale root", () => {
    expect(resolveTenant({ pathname: "/vi" })).toBeNull();
  });

  it("never resolves via host in phase 1", () => {
    expect(
      resolveTenant({ pathname: "/teacher", host: "acme.eduportal.vn" }),
    ).toBeNull();
  });
});

describe("tenantUrl", () => {
  it("builds a locale-relative tenant path", () => {
    expect(tenantUrl("acme", "/teacher")).toBe("/t/acme/teacher");
  });

  it("normalises a path without a leading slash", () => {
    expect(tenantUrl("acme", "teacher/attendance")).toBe(
      "/t/acme/teacher/attendance",
    );
  });

  it("returns the tenant root when no path is given", () => {
    expect(tenantUrl("acme")).toBe("/t/acme");
    expect(tenantUrl("acme", "/")).toBe("/t/acme");
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
    expect(hasTenantMembership([], "t-acme")).toBe(false);
  });

  it("lists the roles held within a tenant", () => {
    expect(rolesInTenant(roles, "t-acme")).toEqual([
      { role: "teacher", tenantId: "t-acme", tenantName: "Acme" },
    ]);
  });
});
