import type { MemberResponseDto } from "./iam-member-response.dto";
import type { TokenResponseDto } from "./token-response.dto";

/**
 * IAM `LookupInvitationResponse` — `POST /api/v1/invitations/lookup`
 * (public, US-191). Exactly four fields by design (data minimization for an
 * unauthenticated caller): no `invitedBy`, no invitation id, nothing about
 * other members.
 */
export interface LookupInvitationResponseDto {
  email: string;
  tenantName: string;
  /** UPPERCASE wire enums, e.g. `["TEACHER"]`. */
  roles: string[];
  expiresAt: string;
}

/**
 * IAM `RedeemInvitationResponse` — `POST /api/v1/invitations/redeem`
 * (public, US-191, HTTP 201). Reuses the SAME `MemberResponse`/`TokenResponse`
 * shapes the accept and signin paths already consume — no parallel session DTO.
 */
export interface RedeemInvitationResponseDto {
  member: MemberResponseDto;
  tokens: TokenResponseDto;
}
