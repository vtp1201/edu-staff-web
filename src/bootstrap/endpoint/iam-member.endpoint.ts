/**
 * IAM member/invitation/tenant endpoints (US-E06.4).
 * Routed through Kong gateway (ADR 0030): `/iam/api/v1/...`.
 * camelCase wire (decision 0017).
 */
/**
 * `/tenants/{id}/members` serves BOTH the `POST` add-member mutation and the
 * `GET` member-directory list (IAM US-144). One source string, two
 * intent-revealing names below — do not copy the literal.
 */
const tenantMembers = (tenantId: string) =>
  `/iam/api/v1/tenants/${tenantId}/members`;

/** `POST` invite + `GET` cursor-paginated invitation list (IAM US-147). */
const tenantInvitations = (tenantId: string) =>
  `/iam/api/v1/tenants/${tenantId}/invitations`;

const tenantInvitation = (tenantId: string, invId: string) =>
  `${tenantInvitations(tenantId)}/${invId}`;

export const IAM_MEMBER_EP = {
  myTenants: "/iam/api/v1/members/me/tenants",
  switchTenant: "/iam/api/v1/members/switch-tenant",
  invitations: tenantInvitations,
  invitation: tenantInvitation,
  /** `POST` — rotate the token + expiry of one invitation (IAM US-147). */
  invitationResend: (tenantId: string, invId: string) =>
    `${tenantInvitation(tenantId, invId)}/resend`,
  acceptInvitation: "/iam/api/v1/invitations/accept",
  /** `POST` — add a member to the tenant. */
  members: tenantMembers,
  /**
   * `GET` — cursor-paginated member directory (IAM US-144, US-E18.23).
   * Query: `role` (UPPERCASE enum), `search`, `cursor`, `limit` (≤100).
   */
  directoryMembers: tenantMembers,
  /**
   * `GET` — batch display lookup. The ids are a COMMA-SEPARATED `ids` QUERY
   * param (max 50), not a path segment, so this stays a plain constant; the
   * repository builds `{ params: { ids: ids.join(",") } }`. Scoped to the
   * caller's active tenant claim — no tenant id in the path.
   */
  batchMembers: "/iam/api/v1/members",
  member: (tenantId: string, userId: string) =>
    `/iam/api/v1/tenants/${tenantId}/members/${userId}`,
  tenants: "/iam/api/v1/tenants",
  tenant: (id: string) => `/iam/api/v1/tenants/${id}`,
  activateTenant: (id: string) => `/iam/api/v1/tenants/${id}/activate`,
  deactivateTenant: (id: string) => `/iam/api/v1/tenants/${id}/deactivate`,
} as const;

export { OAUTH_CLIENT_ID } from "./tenant.endpoint";
