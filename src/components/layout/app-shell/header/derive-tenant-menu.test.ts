/**
 * US-E23.1 header gating (FR-001/002/007). Pure derivation extracted from
 * `Header` so the zero-noise visibility rule and current-tenant matching are
 * node-testable without mounting the effect-gated Header/Radix tree.
 */
import { describe, expect, it } from "vitest";
import type { TenantCardViewModel } from "@/components/shared/tenant-card";
import { deriveTenantMenu } from "./derive-tenant-menu";

function vm(over: Partial<TenantCardViewModel>): TenantCardViewModel {
  return {
    tenantId: "t1",
    roles: ["teacher"],
    status: "ACTIVE",
    tenantName: "School",
    address: "addr",
    logoColor: "primary",
    isCurrent: false,
    isSwitchable: true,
    ...over,
  };
}

describe("deriveTenantMenu", () => {
  it("canSwitch=true with ≥2 ACTIVE switchable memberships (FR-001)", () => {
    const r = deriveTenantMenu(
      [vm({ tenantId: "a" }), vm({ tenantId: "b" })],
      "a",
      true,
    );
    expect(r.canSwitch).toBe(true);
  });

  it("canSwitch=false with exactly 1 switchable membership (FR-002 zero-noise)", () => {
    const r = deriveTenantMenu([vm({ tenantId: "a" })], "a", true);
    expect(r.canSwitch).toBe(false);
  });

  it("counts only ACTIVE/switchable toward the ≥2 threshold", () => {
    const r = deriveTenantMenu(
      [
        vm({ tenantId: "a", isSwitchable: true, status: "ACTIVE" }),
        vm({ tenantId: "b", isSwitchable: false, status: "SUSPENDED" }),
      ],
      "a",
      true,
    );
    expect(r.canSwitch).toBe(false);
  });

  it("canSwitch=false on fetch-fail (empty memberships) — fail-closed (FR-002)", () => {
    expect(deriveTenantMenu([], "a", true).canSwitch).toBe(false);
  });

  it("canSwitch=false when no switch action is wired", () => {
    const r = deriveTenantMenu(
      [vm({ tenantId: "a" }), vm({ tenantId: "b" })],
      "a",
      false,
    );
    expect(r.canSwitch).toBe(false);
  });

  it("matches the current membership by currentTenantId (FR-007 happy path)", () => {
    const r = deriveTenantMenu(
      [vm({ tenantId: "a" }), vm({ tenantId: "b", tenantName: "Beta" })],
      "b",
      true,
    );
    expect(r.currentMembership?.tenantName).toBe("Beta");
  });

  it("falls back to undefined on a stale/foreign tenantId (FR-007 fallback)", () => {
    const r = deriveTenantMenu([vm({ tenantId: "a" })], "ghost", true);
    expect(r.currentMembership).toBeUndefined();
  });

  it("returns undefined current when currentTenantId is absent", () => {
    const r = deriveTenantMenu([vm({ tenantId: "a" })], undefined, true);
    expect(r.currentMembership).toBeUndefined();
  });
});
