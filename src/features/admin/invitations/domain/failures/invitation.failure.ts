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
  /** 409 `invitation_not_resendable` — the row is ACCEPTED/REVOKED (US-E18.29). */
  | { type: "invitation-not-resendable" }
  /**
   * 429 `rate_limit_exceeded` — the per-invitationId resend limiter (3/1h).
   * `retryAfterSeconds` comes from the response's `Retry-After` header when the
   * server sent one; presentation shows a distinct "try again later" toast and
   * does NOT refetch (nothing changed server-side).
   */
  | { type: "rate-limited"; retryAfterSeconds?: number }
  /** 400 `invalid_request_parameters` — malformed cursor/limit/status (defensive). */
  | { type: "invalid-request" }
  /**
   * 403 `forbidden_action` — the caller's real role/tenant scope does not allow
   * this list/mutation (AC-8, ADR 0063 defense-in-depth). Near-unreachable
   * because the route + every Server Action is already `admin`-gated, but it
   * MUST keep its own identity: retrying a 403 can never succeed, so
   * presentation renders a distinct error state with NO retry control.
   */
  | { type: "forbidden" }
  | { type: "validation"; fields: { field: string; message: string }[] }
  | { type: "unknown" };
