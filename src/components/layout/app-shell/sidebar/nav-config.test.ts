import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROUTE,
  NAV_BY_ROLE,
  ROLE_LABEL_KEY,
  type Role,
} from "./nav-config";

const ROLES: Role[] = ["teacher", "principal", "student", "parent", "admin"];

describe("NAV_BY_ROLE", () => {
  it("defines nav items for all roles", () => {
    expect(Object.keys(NAV_BY_ROLE).sort()).toEqual([...ROLES].sort());
  });

  it("gives each role a non-empty list with unique hrefs", () => {
    for (const role of ROLES) {
      const items = NAV_BY_ROLE[role];
      expect(items.length).toBeGreaterThan(0);
      const hrefs = items.map((i) => i.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });

  it("scopes every non-shared href under its role segment", () => {
    for (const role of ROLES) {
      for (const item of NAV_BY_ROLE[role]) {
        if (item.href === "/profile") continue; // shared route
        expect(item.href.startsWith(`/${role}`)).toBe(true);
      }
    }
  });

  it("always exposes the shared profile entry last", () => {
    // Admin intentionally has no /profile nav item (profile via header) — exclude it.
    for (const role of ROLES.filter((r) => r !== "admin")) {
      const items = NAV_BY_ROLE[role];
      expect(items.at(-1)?.href).toBe("/profile");
    }
  });

  it("includes the role's home dashboard as the first item", () => {
    expect(NAV_BY_ROLE.teacher[0].href).toBe("/teacher");
    expect(NAV_BY_ROLE.principal[0].href).toBe("/principal");
    expect(NAV_BY_ROLE.student[0].href).toBe("/student");
    expect(NAV_BY_ROLE.parent[0].href).toBe("/parent");
  });
});

describe("admin role", () => {
  it("returns exactly 7 nav items for admin", () => {
    expect(NAV_BY_ROLE.admin.length).toBe(7);
  });

  it("all admin hrefs start with /admin", () => {
    for (const item of NAV_BY_ROLE.admin) {
      expect(item.href.startsWith("/admin")).toBe(true);
    }
  });

  it("DEFAULT_ROUTE.admin is /admin/school-setup", () => {
    expect(DEFAULT_ROUTE.admin).toBe("/admin/school-setup");
  });

  it("ROLE_LABEL_KEY.admin is 'admin'", () => {
    expect(ROLE_LABEL_KEY.admin).toBe("admin");
  });
});

describe("ROLE_LABEL_KEY", () => {
  it("maps each role to its own label key", () => {
    for (const role of ROLES) {
      expect(ROLE_LABEL_KEY[role]).toBe(role);
    }
  });
});
