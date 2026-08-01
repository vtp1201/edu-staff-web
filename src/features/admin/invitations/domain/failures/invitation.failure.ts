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

/**
 * Is re-issuing the SAME request capable of a different outcome?
 *
 * Only transport/5xx (`network-error`, `unknown`) and the throttle
 * (`rate-limited`, which BE itself marks `retryable: true`) qualify. Every
 * verdict-class failure — 403 `forbidden`, 400 `invalid-request`, 409/410 row
 * races, `validation` — is stable, so retrying only burns a request and delays
 * the error the admin needs to see (state-architecture.md §3). Mirrors
 * `parent-student-link.failure.ts`'s `isRetryableFailure`.
 */
export function isRetryableInvitationFailure(
  failure: InvitationFailure,
): boolean {
  switch (failure.type) {
    case "network-error":
    case "unknown":
    case "rate-limited":
      return true;
    default:
      return false;
  }
}
