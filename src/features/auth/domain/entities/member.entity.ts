/**
 * Tenant-membership row returned by IAM `POST /invitations/accept`
 * (`MemberResponse`, US-E21.2). Distinct from `TenantMembership`
 * (`GET /members/me/tenants` summary) and `Invitation` (admin list row,
 * US-E21.1) — three different wire shapes, do not collapse them.
 */
export type MembershipRowStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "LEFT";

export interface Member {
  tenantId: string;
  userId: string;
  /**
   * Raw wire role enums (e.g. `["TEACHER"]`) — unmapped, mirrors
   * `select-tenant`'s own precedent of passing the raw role straight through to
   * `tenantUrl`.
   */
  roles: string[];
  status: MembershipRowStatus;
}
