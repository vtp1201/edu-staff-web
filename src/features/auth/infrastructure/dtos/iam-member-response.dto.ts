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

/**
 * Real wire `InvitationResponse` (returned only from the POST-invite call) is
 * exactly `{ invitationId, email, roles[], expiresAt }` — ground-truthed
 * against edu-api Go source (US-E21.1, integration.md §6.3).
 *
 * The `tenantId`/`status`/`invitedBy`/`sentAt` fields below are **MOCK-ONLY**:
 * they are NEVER present on the real wire response and are here purely to
 * document the shape the mock repo composes for the (permanently-mocked) list
 * screen. Do NOT "finish" this DTO by treating them as real — there is no real
 * list route to source them from.
 */
export interface InvitationResponseDto {
  invitationId: string;
  email: string;
  roles: string[];
  expiresAt: string;
  /** MOCK-ONLY — not on the real wire. */
  tenantId?: string;
  /** MOCK-ONLY — not on the real wire. */
  status?: string;
  /** MOCK-ONLY — not on the real wire. */
  invitedBy?: string;
  /** MOCK-ONLY — not on the real wire. */
  sentAt?: string;
}
