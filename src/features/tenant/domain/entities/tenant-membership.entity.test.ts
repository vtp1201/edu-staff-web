import { describe, expect, it } from "vitest";
import {
  classifyMembershipCount,
  isSwitchable,
  type TenantMembership,
} from "./tenant-membership.entity";

function membership(
  overrides: Partial<TenantMembership> = {},
): TenantMembership {
  return {
    tenantId: "t-1",
    roles: ["teacher"],
    status: "ACTIVE",
    ...overrides,
  };
}

describe("classifyMembershipCount", () => {
  it('returns "none" for an empty list', () => {
    expect(classifyMembershipCount([])).toBe("none");
  });

  it('returns "single" for exactly one ACTIVE membership', () => {
    expect(classifyMembershipCount([membership({ tenantId: "t-1" })])).toBe(
      "single",
    );
  });

  it('returns "multiple" for two ACTIVE memberships', () => {
    expect(
      classifyMembershipCount([
        membership({ tenantId: "t-1" }),
        membership({ tenantId: "t-2" }),
      ]),
    ).toBe("multiple");
  });

  it('returns "multiple" for three or more ACTIVE memberships', () => {
    expect(
      classifyMembershipCount([
        membership({ tenantId: "t-1" }),
        membership({ tenantId: "t-2" }),
        membership({ tenantId: "t-3" }),
      ]),
    ).toBe("multiple");
  });

  // AC-003.3 — only ACTIVE memberships count; non-ACTIVE are ignored.
  it('counts only ACTIVE memberships: 1 ACTIVE among non-ACTIVE → "single"', () => {
    expect(
      classifyMembershipCount([
        membership({ tenantId: "t-1", status: "ACTIVE" }),
        membership({ tenantId: "t-2", status: "INACTIVE" }),
        membership({ tenantId: "t-3", status: "SUSPENDED" }),
        membership({ tenantId: "t-4", status: "LEFT" }),
      ]),
    ).toBe("single");
  });

  it('counts only ACTIVE memberships: 2 ACTIVE among non-ACTIVE → "multiple"', () => {
    expect(
      classifyMembershipCount([
        membership({ tenantId: "t-1", status: "ACTIVE" }),
        membership({ tenantId: "t-2", status: "INACTIVE" }),
        membership({ tenantId: "t-3", status: "ACTIVE" }),
        membership({ tenantId: "t-4", status: "LEFT" }),
      ]),
    ).toBe("multiple");
  });

  // AC-003.3 — all-INACTIVE/SUSPENDED/LEFT counts as empty, not a broken grid.
  it('returns "none" when every membership is non-ACTIVE', () => {
    expect(
      classifyMembershipCount([
        membership({ tenantId: "t-1", status: "INACTIVE" }),
        membership({ tenantId: "t-2", status: "SUSPENDED" }),
        membership({ tenantId: "t-3", status: "LEFT" }),
      ]),
    ).toBe("none");
  });

  it("is order-independent", () => {
    const items = [
      membership({ tenantId: "t-1", status: "INACTIVE" }),
      membership({ tenantId: "t-2", status: "ACTIVE" }),
      membership({ tenantId: "t-3", status: "ACTIVE" }),
    ];
    expect(classifyMembershipCount(items)).toBe("multiple");
    expect(classifyMembershipCount([...items].reverse())).toBe("multiple");
  });

  it("agrees with isSwitchable on which memberships are counted", () => {
    const items = [
      membership({ tenantId: "t-1", status: "ACTIVE" }),
      membership({ tenantId: "t-2", status: "SUSPENDED" }),
    ];
    const activeCount = items.filter(isSwitchable).length;
    expect(activeCount).toBe(1);
    expect(classifyMembershipCount(items)).toBe("single");
  });
});
