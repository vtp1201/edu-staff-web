/** Caller's membership in one tenant (IAM `MembershipSummary`, BE US-020). */
export type MembershipStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "LEFT";

export interface TenantMembership {
  /** BE tenant UUID (no slug yet — see resolve-tenant interim note). */
  tenantId: string;
  roles: string[];
  status: MembershipStatus;
}

/** Only ACTIVE memberships can be switched into (BE rejects others with 403). */
export function isSwitchable(m: TenantMembership): boolean {
  return m.status === "ACTIVE";
}

/**
 * Routing-branch outcome for the post-login select-tenant screen (US-E23.2),
 * derived purely from the count of ACTIVE switchable memberships:
 * - `"multiple"` (≥2 ACTIVE) → show the card grid;
 * - `"single"` (exactly 1 ACTIVE) → skip the screen, switch straight into it;
 * - `"none"` (0 ACTIVE) → empty state (incl. all-INACTIVE/SUSPENDED/LEFT, AC-003.3).
 */
export type MembershipCountBranch = "multiple" | "single" | "none";

/** Classify the routing branch by counting only ACTIVE (switchable)
 *  memberships — non-ACTIVE entries never count (AC-003.3). */
export function classifyMembershipCount(
  memberships: TenantMembership[],
): MembershipCountBranch {
  const active = memberships.filter(isSwitchable);
  if (active.length >= 2) return "multiple";
  if (active.length === 1) return "single";
  return "none";
}
