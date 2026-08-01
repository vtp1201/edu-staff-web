import type { TenantMembership } from "@/features/tenant/domain/entities/tenant-membership.entity";
import type { AuthTokens } from "../entities/auth-user.entity";
import type {
  Invitation,
  InvitationStatus,
} from "../entities/invitation.entity";
import type { Member } from "../entities/member.entity";

export interface InviteMemberRequest {
  email: string;
  roles: string[];
}

/**
 * Query params of `GET /iam/api/v1/tenants/{id}/invitations` (IAM US-147).
 * There is NO server-side search/`q` param — email substring search stays
 * client-side over the pages already loaded (US-E18.29).
 */
export interface ListInvitationsParams {
  status?: InvitationStatus;
  cursor?: string;
  /** Page size; BE defaults to 20 and caps at 100. */
  limit?: number;
}

/**
 * One cursor page of invitations. Mirrors `iam-directory`'s `DirectoryPage`:
 * a SHORT page (even an empty one) with `hasMore: true` is normal — BE applies
 * the `status` filter after a bounded keyset read, so callers must keep
 * following `nextCursor` until `hasMore` is false.
 */
export interface InvitationsPage {
  data: Invitation[];
  nextCursor: string | null;
  hasMore: boolean;
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
  /**
   * POST /iam/api/v1/invitations/accept (US-E21.2). `RequireAuth`-gated; body
   * is `{token}` only (`ActorUserID`/`ActorEmail` come from the JWT, never the
   * body — ADR 0059). Returns the created `MemberResponse` for the invited
   * tenant; throws a typed {@link IamMemberFailure} on error.
   */
  acceptInvitation(token: string): Promise<Member>;
  /**
   * `GET /iam/api/v1/tenants/:tenantId/invitations?status&cursor&limit` —
   * cursor-paginated invitation list, tenant ADMIN/SUPER_ADMIN only (stricter
   * than the member directory: this surface exposes invitee emails = PII).
   * Wired real in US-E18.29 (IAM US-147).
   */
  listInvitations(
    tenantId: string,
    params?: ListInvitationsParams,
  ): Promise<InvitationsPage>;
  /**
   * `POST /iam/api/v1/tenants/:tenantId/invitations/:invitationId/resend` —
   * rotates the accept token + `expiresAt` and resets `status` to `pending`,
   * PRESERVING `roles`/`invitedBy`/`createdAt`. Returns the refreshed row.
   * Rate-limited per invitationId (429 `rate_limit_exceeded` + `Retry-After`).
   * Wired real in US-E18.29 (IAM US-147).
   */
  resendInvitation(tenantId: string, invitationId: string): Promise<Invitation>;
}
