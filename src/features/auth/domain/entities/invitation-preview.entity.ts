/**
 * Read-only preview of an invitation, returned by the PUBLIC
 * `POST /invitations/lookup` (IAM US-191, ADR 0131 D10) so the redemption form
 * can say "Join <tenantName> as <roles> — you'll sign in as <email>" instead of
 * rendering a blind password form.
 *
 * Deliberately minimal: the wire carries no `invitedBy`, no invitation id and
 * nothing about other members, because the caller is unauthenticated (data
 * minimization). Do not widen this entity with fields the FE could "derive" —
 * there is nothing else to derive from.
 *
 * Distinct from {@link Invitation} (the admin list row, US-E21.1): that one is
 * a tenant-admin view of an invitation; this is the invitee's own pre-auth view.
 */
export interface InvitationPreview {
  /** The INVITED address, resolved server-side. The form shows it read-only. */
  email: string;
  tenantName: string;
  /** RAW wire role enums (e.g. `["TEACHER"]`) — the presentation layer labels them. */
  roles: string[];
  /** ISO timestamp. */
  expiresAt: string;
}
