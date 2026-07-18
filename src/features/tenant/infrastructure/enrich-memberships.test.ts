import { describe, expect, it } from "vitest";
import type { TenantMembership } from "../domain/entities/tenant-membership.entity";
import { enrichMemberships } from "./enrich-memberships";

const acme: TenantMembership = {
  tenantId: "tenant-acme",
  roles: ["teacher"],
  status: "ACTIVE",
};
const suspended: TenantMembership = {
  tenantId: "tenant-beta",
  roles: ["parent"],
  status: "SUSPENDED",
};

describe("enrichMemberships", () => {
  it("attaches display fields + isCurrent + isSwitchable", () => {
    const [vm] = enrichMemberships([acme], "tenant-acme");
    expect(vm.tenantName).toBe("THPT Chu Văn An");
    expect(vm.isCurrent).toBe(true);
    expect(vm.isSwitchable).toBe(true);
    expect(vm.roles).toEqual(["teacher"]);
  });

  it("marks non-matching tenants as not current", () => {
    const [vm] = enrichMemberships([acme], "tenant-other");
    expect(vm.isCurrent).toBe(false);
  });

  it("derives isSwitchable from ACTIVE status (SUSPENDED → false)", () => {
    const [vm] = enrichMemberships([suspended], "tenant-beta");
    expect(vm.isSwitchable).toBe(false);
  });

  it("treats a null/undefined currentTenantId as no current tenant (E23.2 pre-entry)", () => {
    const vms = enrichMemberships([acme, suspended], null);
    expect(vms.every((v) => v.isCurrent === false)).toBe(true);
  });

  it("returns [] for an empty list (fail-closed shape from layout.tsx)", () => {
    expect(enrichMemberships([], "tenant-acme")).toEqual([]);
  });
});
