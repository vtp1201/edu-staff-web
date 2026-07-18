/**
 * Typed failure union for admin invitation flows (US-E21.1).
 *
 * `invitation-invalid` is reused VERBATIM from the real IAM revoke wire code
 * (`invitation_invalid`, ground-truth #6) — do NOT invent `not-found`. It also
 * carries the resend "row changed state" race. `invalid-state` is reserved for
 * a resend race the mock surfaces distinctly if ever needed; both map to a
 * "refetch to reconcile" behaviour in the container.
 */
export type InvitationFailure =
  | { type: "network-error" }
  | { type: "invalid-state" }
  | { type: "invitation-invalid" }
  | { type: "validation"; fields: { field: string; message: string }[] }
  | { type: "unknown" };
