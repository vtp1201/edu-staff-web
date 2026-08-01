import type {
  Invitation,
  InvitationStatus,
} from "@/features/auth/domain/entities/invitation.entity";
import type {
  Member,
  MembershipRowStatus,
} from "@/features/auth/domain/entities/member.entity";
import type { TenantMembership } from "@/features/tenant/domain/entities/tenant-membership.entity";
import type {
  InvitationListItemResponseDto,
  MemberResponseDto,
  MembershipSummaryDto,
} from "../dtos/iam-member-response.dto";

export function mapMembershipSummary(
  dto: MembershipSummaryDto,
): TenantMembership {
  return {
    tenantId: dto.tenantId,
    roles: dto.roles,
    status: dto.status as TenantMembership["status"],
  };
}

const INVITATION_STATUSES: readonly string[] = [
  "pending",
  "accepted",
  "expired",
  "revoked",
];

/**
 * Map one real `InvitationListItem` row (the list AND the resend response,
 * IAM US-147) to the shared {@link Invitation} entity.
 *
 * The only translation is the role case-fold (wire enum is UPPERCASE, the entity
 * contract is lowercase); `status` is already lowercase on the wire and is
 * narrowed defensively so a future BE enum value cannot widen the union at
 * runtime. `invitedBy` stays the RAW userId — display-name resolution belongs to
 * the consuming feature's infrastructure, not here.
 */
export function mapInvitationListItem(
  dto: InvitationListItemResponseDto,
): Invitation {
  return {
    invitationId: dto.invitationId,
    email: dto.email,
    roles: dto.roles.map((r) => r.toLowerCase()),
    status: INVITATION_STATUSES.includes(dto.status)
      ? (dto.status as InvitationStatus)
      : "pending",
    invitedBy: dto.invitedBy,
    createdAt: dto.createdAt,
    expiresAt: dto.expiresAt,
  };
}

/** Map the `MemberResponse` returned by `POST /invitations/accept` (US-E21.2). */
export function mapMemberResponse(dto: MemberResponseDto): Member {
  return {
    tenantId: dto.tenantId,
    userId: dto.userId,
    roles: dto.roles,
    status: dto.status as MembershipRowStatus,
  };
}
