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
