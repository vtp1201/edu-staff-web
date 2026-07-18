import "server-only";
import type { AxiosInstance } from "axios";
import { IAM_MEMBER_EP } from "@/bootstrap/endpoint/iam-member.endpoint";
import { errorCodeOf } from "@/bootstrap/lib/api-envelope";
import type { TenantMembership } from "@/features/tenant/domain/entities/tenant-membership.entity";
import type { AuthTokens } from "../../domain/entities/auth-user.entity";
import type { Invitation } from "../../domain/entities/invitation.entity";
import type { Member } from "../../domain/entities/member.entity";
import type { IamMemberFailure } from "../../domain/failures/iam-member.failure";
import type {
  IIamMemberRepository,
  InviteMemberRequest,
} from "../../domain/repositories/i-iam-member.repository";
import type {
  MemberResponseDto,
  MembershipSummaryDto,
} from "../dtos/iam-member-response.dto";
import type { TokenResponseDto } from "../dtos/token-response.dto";
import { mapTokens } from "../mappers/auth.mapper";
import {
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

  /**
   * MOCK-ONLY guard (US-E21.1). No real IAM `GET` list route exists (see
   * integration.md §6) — the DI factory always routes list/resend to
   * `MockIamMemberRepository`, so this is never reached in real mode. It exists
   * only so the real class still satisfies `IIamMemberRepository` and the app
   * compiles with `NEXT_PUBLIC_USE_MOCK` unset. Same "real class = permanent
   * blocked stub" precedent as `staff-leave` (US-E18.8).
   */
  listInvitations(): Promise<Invitation[]> {
    throw new Error(
      "listInvitations has no real IAM route (mock-only, US-E21.1); see integration.md §6",
    );
  }

  /** MOCK-ONLY guard (US-E21.1) — see {@link listInvitations}. */
  resendInvitation(): Promise<Invitation> {
    throw new Error(
      "resendInvitation has no real IAM route (mock-only, US-E21.1); see integration.md §6",
    );
  }
}
