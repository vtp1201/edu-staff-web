import type { TenantCardViewModel } from "@/components/shared/tenant-card";

export interface TenantMenuState {
  /** Show the "Đổi trường" item + dialog (FR-001/002 zero-noise gate). */
  canSwitch: boolean;
  /** The caller's current-tenant membership, or `undefined` on a stale/foreign
   *  tenantId or a fetch failure (FR-007 role-only fallback). */
  currentMembership: TenantCardViewModel | undefined;
}

/**
 * Pure header gating derivation (US-E23.1). The menu item exists only with ≥2
 * ACTIVE switchable memberships AND a wired switch action; the current-tenant
 * block matches the decoded tenantId claim against the list, falling back to
 * `undefined` (role-only display) when there is no match.
 */
export function deriveTenantMenu(
  memberships: TenantCardViewModel[],
  currentTenantId: string | undefined,
  hasSwitchAction: boolean,
): TenantMenuState {
  const currentMembership = currentTenantId
    ? memberships.find((m) => m.tenantId === currentTenantId)
    : undefined;
  const canSwitch =
    hasSwitchAction && memberships.filter((m) => m.isSwitchable).length >= 2;
  return { canSwitch, currentMembership };
}
