/**
 * Shared invitation row produced by {@link IIamMemberRepository}'s
 * `listInvitations`/`resendInvitation` methods.
 *
 * REAL WIRE as of US-E18.29 (IAM US-147): `GET /tenants/{id}/invitations` and
 * `POST /tenants/{id}/invitations/{invitationId}/resend` both return
 * `InvitationListItem` — `{invitationId, email, roles[], status, invitedBy,
 * createdAt, expiresAt}` — so every field here is now server-sourced (it used to
 * be a mock-only model, US-E21.1). The invite **token** is still never on any
 * response (email delivery only), which is why copy-link has no real link.
 *
 * `invitedBy` is a raw **userId** on the wire; resolving it to a display name is
 * NOT this entity's job — the `admin/invitations` infrastructure layer does that
 * via `iam-directory`'s batch lookup. `status` is BE-projected: a PENDING row
 * whose `expiresAt` has passed reports `expired`.
 *
 * `roles` holds LOWERCASED wire values (the wire enum is UPPERCASE; the mapper
 * folds it) — the admin-invitations feature maps these into its own
 * screen-facing `InvitationRole` type at its own infrastructure boundary. This
 * entity stays in `auth/domain` (the contract owner) and is unaware of the
 * admin screen.
 */
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface Invitation {
  invitationId: string;
  email: string;
  /** Lowercased wire roles, e.g. ["teacher"] / ["manager"]. */
  roles: string[];
  /** BE-projected status (a PENDING row past `expiresAt` reports `expired`). */
  status: InvitationStatus;
  /** Raw userId of the inviting admin — never re-attributed on resend. */
  invitedBy: string;
  /** ISO timestamp — creation time, preserved across a resend. */
  createdAt: string;
  /** ISO timestamp — refreshed by a resend. */
  expiresAt: string;
}
