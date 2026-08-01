/**
 * IAM member/invitation DTOs (US-E06.4). camelCase wire (decision 0017).
 *
 * Shape corrected in US-E18.6 against `edu-api/services/iam/docs/openapi.yaml`
 * `MembershipSummary`/`MemberResponse`/`InvitationResponse` schemas — the real
 * wire has no `tenantName`/`email`/`name` on these. `MemberResponseDto` is the
 * body `POST /invitations/accept` returns (parsed by `IamMemberRepository`'s
 * `acceptInvitation`, US-E21.2). `InvitationResponseDto` remains documentation
 * for the (mostly mock-only) list shape.
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

/**
 * Real wire `InvitationResponse` — the body of the POST-invite (201) call only:
 * exactly `{ invitationId, email, roles[], expiresAt }` (no status/invitedBy/
 * createdAt). Ground-truthed against edu-api's `openapi.yaml` (US-E21.1).
 * The invite token is NEVER returned (email delivery only).
 */
export interface InvitationResponseDto {
  invitationId: string;
  email: string;
  roles: string[];
  expiresAt: string;
}

/**
 * Real wire `InvitationListItem` (IAM US-147) — the row shape of BOTH
 * `GET /tenants/{id}/invitations` and the `.../resend` 200 response.
 * All 7 fields are `required` in the schema. `roles` is UPPERCASE on the wire;
 * `status` is lowercase and BE-PROJECTED (a PENDING row past `expiresAt` reads
 * `expired`); `invitedBy` is a raw userId.
 */
export interface InvitationListItemResponseDto {
  invitationId: string;
  email: string;
  roles: string[];
  status: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
}
