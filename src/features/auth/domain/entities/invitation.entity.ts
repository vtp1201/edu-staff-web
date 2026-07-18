/**
 * Shared invitation shape produced by {@link IIamMemberRepository}'s
 * mock-only `listInvitations`/`resendInvitation` methods (US-E21.1).
 *
 * PERMANENTLY MOCK: the real IAM service has no `GET` list route and no resend
 * route (ground-truthed against edu-api Go source — see
 * `docs/stories/epics/E21-tenant-invitations/US-E21.1-admin-invitations/integration.md`
 * §6). The real `InvitationResponse` wire shape is only `{invitationId, email,
 * roles[], expiresAt}` (returned from the POST-invite call), so `tenantId`,
 * `status`, `invitedBy`, and `sentAt` here are **never present on the real wire**
 * — they exist only in the locally-mocked model.
 *
 * `roles` holds lowercased wire values (e.g. "teacher", "manager") — the
 * admin-invitations feature maps these into its own screen-facing
 * `InvitationRole` type at the infrastructure boundary. This entity stays in
 * `auth/domain` (the contract owner) and is unaware of the admin screen.
 */
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface Invitation {
  invitationId: string;
  /** Mock-only — never on the real wire response. */
  tenantId: string;
  email: string;
  /** Lowercased wire roles, e.g. ["teacher"] / ["manager"]. */
  roles: string[];
  /** Mock-only — never on the real wire response. */
  status: InvitationStatus;
  /** Mock-only — never on the real wire response. */
  invitedBy: string;
  /** ISO timestamp. Mock-only — never on the real wire response. */
  sentAt: string;
  /** ISO timestamp — the one field that IS on the real wire. */
  expiresAt: string;
}
