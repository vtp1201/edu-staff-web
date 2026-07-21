/**
 * Typed failure union for the parent notification-consent section (US-E20.2).
 *
 * - `forbidden` — 403 memberId-scoping rejection. Rendered as a HARD section
 *   error, NEVER conflated with the genuine-empty state (AC-002.2) — a silent
 *   empty here would mask a security failure.
 * - `network-error` — transport / 5xx / timeout (the only retryable type).
 * - `validation` — 422 on a toggle update, per-field messages.
 *
 * Branch on `error.code` (UPPER_SNAKE) / status only, never on `message`
 * (decision 0008).
 */
export type ParentConsentFailure =
  | { type: "forbidden" }
  | { type: "network-error" }
  | { type: "validation"; fields: { field: string; message: string }[] };

/** Only transport/5xx failures are retryable. */
export function isRetryableFailure(failure: ParentConsentFailure): boolean {
  return failure.type === "network-error";
}
