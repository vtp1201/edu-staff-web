import "server-only";
import type { AxiosInstance } from "axios";
import { IAM_MEMBER_EP } from "@/bootstrap/endpoint/iam-member.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
  retryAfterSecondsOf,
} from "@/bootstrap/lib/api-envelope";
import type { TenantMembership } from "@/features/tenant/domain/entities/tenant-membership.entity";
import type { AuthTokens } from "../../domain/entities/auth-user.entity";
import type { Invitation } from "../../domain/entities/invitation.entity";
import type { Member } from "../../domain/entities/member.entity";
import type { IamMemberFailure } from "../../domain/failures/iam-member.failure";
import type {
  IIamMemberRepository,
  InvitationsPage,
  InviteMemberRequest,
  ListInvitationsParams,
} from "../../domain/repositories/i-iam-member.repository";
import type {
  InvitationListItemResponseDto,
  MemberResponseDto,
  MembershipSummaryDto,
} from "../dtos/iam-member-response.dto";
import type { TokenResponseDto } from "../dtos/token-response.dto";
import { mapTokens } from "../mappers/auth.mapper";
import {
  mapInvitationListItem,
  mapMemberResponse,
  mapMembershipSummary,
} from "../mappers/iam-member.mapper";

/**
 * Maps a normalised {@link ApiError} (branch on `code`, never message) into the
 * domain {@link IamMemberFailure} union.
 *
 * Corrected in US-E18.6: IAM's real wire `error.code` is always the lowercase
 * snake_case i18n key emitted by the Go `apperror` helpers (ground-truthed
 * against `services/iam/internal/membership/core/domain/error/member.go` +
 * `.../tenant/core/domain/error/tenant.go` in edu-api), never UPPER_SNAKE.
 * `member_suspended` (403) is defined BE-side but never thrown by any of the
 * use-cases this repository calls — intentionally left unmapped (falls to
 * `unknown`); revisit if a future BE change starts emitting it.
 */
function mapIamFailure(err: unknown): IamMemberFailure {
  const code = errorCodeOf(err);
  switch (code) {
    case "forbidden_action":
      return { type: "forbidden" };
    case "member_not_found":
      return { type: "not-found" };
    case "member_already_exists":
      return { type: "member-exists" };
    case "member_tenant_inactive":
      return { type: "tenant-inactive" };
    case "member_invalid_transition":
      return { type: "invalid-transition" };
    case "invitation_invalid":
      return { type: "invitation-invalid" };
    case "invitation_expired":
      return { type: "invitation-expired" };
    case "invitation_email_mismatch":
      return { type: "invitation-email-mismatch" };
    case "member_last_admin":
      return { type: "last-admin" };
    // Invitation list/resend (IAM US-147, US-E18.29).
    case "invitation_not_resendable":
      return { type: "invitation-not-resendable" };
    case "rate_limit_exceeded":
      // Per-invitationId resend limiter — `Retry-After` (seconds) when sent.
      return {
        type: "rate-limited",
        retryAfterSeconds: retryAfterSecondsOf(err),
      };
    case "invalid_request_parameters":
      return { type: "invalid-request" };
    case "NETWORK_ERROR":
      return { type: "network-error" };
    default:
      return { type: "unknown" };
  }
}

export class IamMemberRepository implements IIamMemberRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listMyTenants(): Promise<TenantMembership[]> {
    const dto = (await this.http.get(
      IAM_MEMBER_EP.myTenants,
    )) as unknown as MembershipSummaryDto[];
    return dto.map(mapMembershipSummary);
  }

  async switchTenant(tenantId: string, clientId: string): Promise<AuthTokens> {
    const dto = (await this.http.post(IAM_MEMBER_EP.switchTenant, {
      tenantId,
      clientId,
    })) as unknown as TokenResponseDto;
    return mapTokens(dto);
  }

  async inviteMember(
    tenantId: string,
    req: InviteMemberRequest,
  ): Promise<void> {
    try {
      await this.http.post(IAM_MEMBER_EP.invitations(tenantId), req);
    } catch (err) {
      throw mapIamFailure(err);
    }
  }

  async revokeInvitation(
    tenantId: string,
    invitationId: string,
  ): Promise<void> {
    try {
      await this.http.delete(IAM_MEMBER_EP.invitation(tenantId, invitationId));
    } catch (err) {
      throw mapIamFailure(err);
    }
  }

  async addMember(
    tenantId: string,
    userId: string,
    roles: string[],
  ): Promise<void> {
    try {
      await this.http.post(IAM_MEMBER_EP.members(tenantId), { userId, roles });
    } catch (err) {
      throw mapIamFailure(err);
    }
  }

  async changeRoles(
    tenantId: string,
    userId: string,
    roles: string[],
  ): Promise<void> {
    try {
      await this.http.patch(IAM_MEMBER_EP.member(tenantId, userId), { roles });
    } catch (err) {
      throw mapIamFailure(err);
    }
  }

  async removeMember(tenantId: string, userId: string): Promise<void> {
    try {
      await this.http.delete(IAM_MEMBER_EP.member(tenantId, userId));
    } catch (err) {
      throw mapIamFailure(err);
    }
  }

  async acceptInvitation(token: string): Promise<Member> {
    try {
      // Payload is EXACTLY { token } — role/tenantId/email are resolved
      // server-side from the invitation + JWT (ADR 0059 rule 2, F8).
      const dto = (await this.http.post(IAM_MEMBER_EP.acceptInvitation, {
        token,
      })) as unknown as MemberResponseDto;
      return mapMemberResponse(dto);
    } catch (err) {
      throw mapIamFailure(err);
    }
  }

  async listInvitations(
    tenantId: string,
    params?: ListInvitationsParams,
  ): Promise<InvitationsPage> {
    try {
      // Cursor-paginated list → `{ raw: true }` + `parseEnvelope` so
      // `meta.pagination` is readable. `raw` MUST be a top-level config sibling
      // of `params` (US-E18.19 regression class): nested inside `params` it is
      // silently ignored and the payload arrives already unwrapped.
      const envelope = (await this.http.get(
        IAM_MEMBER_EP.invitations(tenantId),
        {
          params: {
            status: params?.status,
            cursor: params?.cursor,
            limit: params?.limit,
          },
          raw: true,
        },
      )) as unknown as ApiEnvelope<InvitationListItemResponseDto[]>;

      const { data, pagination } = parseEnvelope(envelope);
      return {
        // A SHORT (even empty) page with `hasMore: true` is normal here — BE
        // applies `status` after a bounded keyset read. Never treat it as done.
        data: (data ?? []).map(mapInvitationListItem),
        nextCursor: pagination?.nextCursor ?? null,
        hasMore: pagination?.hasMore ?? false,
      };
    } catch (err) {
      throw mapIamFailure(err);
    }
  }

  async resendInvitation(
    tenantId: string,
    invitationId: string,
  ): Promise<Invitation> {
    try {
      // No request body: the resending admin comes from the JWT, and BE
      // preserves roles/invitedBy/createdAt from the original invitation.
      const dto = (await this.http.post(
        IAM_MEMBER_EP.invitationResend(tenantId, invitationId),
      )) as unknown as InvitationListItemResponseDto;
      return mapInvitationListItem(dto);
    } catch (err) {
      throw mapIamFailure(err);
    }
  }
}
