import type {
  MembershipStatus,
  TenantMembership,
} from "../../domain/entities/tenant-membership.entity";
import type { MembershipSummaryDto } from "../dtos/membership-response.dto";

const STATUSES: MembershipStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "LEFT",
];

export function mapMembership(dto: MembershipSummaryDto): TenantMembership {
  const status = STATUSES.includes(dto.status as MembershipStatus)
    ? (dto.status as MembershipStatus)
    : "INACTIVE";
  return { tenantId: dto.tenantId, roles: dto.roles ?? [], status };
}
