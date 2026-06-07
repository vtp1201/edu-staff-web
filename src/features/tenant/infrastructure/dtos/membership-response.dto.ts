export interface MembershipSummaryDto {
  tenantId: string;
  roles: string[];
  status: string;
}

export type MyTenantsResponseDto = MembershipSummaryDto[];
