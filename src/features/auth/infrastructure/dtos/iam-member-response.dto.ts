/** IAM member/invitation DTOs (US-E06.4). camelCase wire (decision 0017). */

export interface MembershipSummaryDto {
  tenantId: string;
  roles: string[];
  status: string;
  tenantName?: string;
}

export interface MemberResponseDto {
  userId: string;
  tenantId: string;
  roles: string[];
  status: string;
  email?: string;
  name?: string;
}

export interface InvitationResponseDto {
  invitationId: string;
  tenantId: string;
  email: string;
  roles: string[];
  status: string;
  expiresAt?: string;
}
