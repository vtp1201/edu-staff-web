/**
 * IAM member/invitation DTOs (US-E06.4). camelCase wire (decision 0017).
 *
 * Shape corrected in US-E18.6 against `edu-api/services/iam/docs/openapi.yaml`
 * `MembershipSummary`/`MemberResponse`/`InvitationResponse` schemas — the real
 * wire has no `tenantName`/`email`/`name` on these. `MemberResponseDto` /
 * `InvitationResponseDto` are currently unused (every mutating
 * `IamMemberRepository` call is fire-and-forget `void` — no method parses a
 * member/invitation response body); kept for wire-shape documentation.
 */

export interface MembershipSummaryDto {
  tenantId: string;
  roles: string[];
  status: string;
}

export interface MemberResponseDto {
  tenantId: string;
  userId: string;
  roles: string[];
  status: string;
}

export interface InvitationResponseDto {
  invitationId: string;
  email: string;
  roles: string[];
  expiresAt: string;
}
