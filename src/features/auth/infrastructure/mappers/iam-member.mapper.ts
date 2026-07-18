import type {
  Member,
  MembershipRowStatus,
} from "@/features/auth/domain/entities/member.entity";
import type { TenantMembership } from "@/features/tenant/domain/entities/tenant-membership.entity";
import type {
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

/** Map the `MemberResponse` returned by `POST /invitations/accept` (US-E21.2). */
export function mapMemberResponse(dto: MemberResponseDto): Member {
  return {
    tenantId: dto.tenantId,
    userId: dto.userId,
    roles: dto.roles,
    status: dto.status as MembershipRowStatus,
  };
}
