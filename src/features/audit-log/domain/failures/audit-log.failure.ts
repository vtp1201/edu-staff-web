/**
 * Typed failure union for the audit-log feature (US-E12.12).
 * The `type` keys double as i18n keys under the `auditLog.errors` namespace —
 * presentation translates, the domain/repo/action never does.
 */
export type AuditLogFailure =
  | { type: "network-error" }
  | { type: "unauthorized" }
  | { type: "forbidden" }
  | { type: "invalid-filter" }
  | { type: "unknown" };

/** Failure types whose UI should offer a retry (only transport errors). */
const RETRYABLE_FAILURES: ReadonlySet<AuditLogFailure["type"]> = new Set([
  "network-error",
]);

export function isRetryableFailure(type: AuditLogFailure["type"]): boolean {
  return RETRYABLE_FAILURES.has(type);
}
