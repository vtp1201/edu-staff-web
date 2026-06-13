import type { TenantMembership } from "@/features/tenant/domain/entities/tenant-membership.entity";
import type { AuthTokens } from "../entities/auth-user.entity";

export interface InviteMemberRequest {
  email: string;
  roles: string[];
}

/**
 * IAM member/invitation/tenant operations (US-E06.4).
 * All mutating ops throw a typed {@link IamMemberFailure} on error.
 */
export interface IIamMemberRepository {
  /** GET /iam/api/v1/members/me/tenants */
  listMyTenants(): Promise<TenantMembership[]>;
  /** POST /iam/api/v1/members/switch-tenant — mint tenant-scoped token */
  switchTenant(tenantId: string, clientId: string): Promise<AuthTokens>;
  /** POST /iam/api/v1/tenants/:tenantId/invitations */
  inviteMember(tenantId: string, req: InviteMemberRequest): Promise<void>;
  /** DELETE /iam/api/v1/tenants/:tenantId/invitations/:invitationId */
  revokeInvitation(tenantId: string, invitationId: string): Promise<void>;
  /** POST /iam/api/v1/tenants/:tenantId/members */
  addMember(tenantId: string, userId: string, roles: string[]): Promise<void>;
  /** PATCH /iam/api/v1/tenants/:tenantId/members/:userId */
  changeRoles(tenantId: string, userId: string, roles: string[]): Promise<void>;
  /** DELETE /iam/api/v1/tenants/:tenantId/members/:userId */
  removeMember(tenantId: string, userId: string): Promise<void>;
  /** POST /iam/api/v1/invitations/accept */
  acceptInvitation(token: string): Promise<void>;
}
