import type { TenantMembership } from "@/features/tenant/domain/entities/tenant-membership.entity";
import type { AuthTokens } from "../entities/auth-user.entity";
import type {
  Invitation,
  InvitationStatus,
} from "../entities/invitation.entity";

export interface InviteMemberRequest {
  email: string;
  roles: string[];
}

export interface ListInvitationsParams {
  status?: InvitationStatus;
  q?: string;
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
  /**
   * List tenant invitations.
   *
   * **MOCK-ONLY** (US-E21.1) — the real IAM service has NO `GET` list route
   * (the `InvitationRepository` port exposes only `Save`/`Get`/`GetByToken`,
   * no `List`; see integration.md §6). The real `IamMemberRepository` throws a
   * "no real route" guard here; only `MockIamMemberRepository` implements it.
   */
  listInvitations(
    tenantId: string,
    params?: ListInvitationsParams,
  ): Promise<Invitation[]>;
  /**
   * Resend an expired invitation (same row, refreshed expiry + back to
   * pending).
   *
   * **MOCK-ONLY** (US-E21.1) — no real resend route exists on IAM (see
   * integration.md §6). Real class throws a guard; only the mock implements it.
   */
  resendInvitation(tenantId: string, invitationId: string): Promise<Invitation>;
}
