import type { TenantMembership } from "@/features/tenant/domain/entities/tenant-membership.entity";
import type { MembershipSummaryDto } from "../dtos/iam-member-response.dto";

export function mapMembershipSummary(
  dto: MembershipSummaryDto,
): TenantMembership {
  return {
    tenantId: dto.tenantId,
    roles: dto.roles,
    status: dto.status as TenantMembership["status"],
  };
}
