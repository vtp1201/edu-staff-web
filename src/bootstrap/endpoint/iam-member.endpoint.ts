/**
 * IAM member/invitation/tenant endpoints (US-E06.4).
 * Routed through Kong gateway (ADR 0030): `/iam/api/v1/...`.
 * camelCase wire (decision 0017).
 */
export const IAM_MEMBER_EP = {
  myTenants: "/iam/api/v1/members/me/tenants",
  switchTenant: "/iam/api/v1/members/switch-tenant",
  invitations: (tenantId: string) =>
    `/iam/api/v1/tenants/${tenantId}/invitations`,
  invitation: (tenantId: string, invId: string) =>
    `/iam/api/v1/tenants/${tenantId}/invitations/${invId}`,
  acceptInvitation: "/iam/api/v1/invitations/accept",
  members: (tenantId: string) => `/iam/api/v1/tenants/${tenantId}/members`,
  member: (tenantId: string, userId: string) =>
    `/iam/api/v1/tenants/${tenantId}/members/${userId}`,
  tenants: "/iam/api/v1/tenants",
  tenant: (id: string) => `/iam/api/v1/tenants/${id}`,
  activateTenant: (id: string) => `/iam/api/v1/tenants/${id}/activate`,
  deactivateTenant: (id: string) => `/iam/api/v1/tenants/${id}/deactivate`,
} as const;

export { OAUTH_CLIENT_ID } from "./tenant.endpoint";
