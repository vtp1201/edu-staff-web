/** Stable failure keys — double as i18n keys under `auditLog.errors`. */
export type AuditLogFailureType =
  | "network-error"
  | "unauthorized"
  | "forbidden"
  | "invalid-filter"
  | "unknown";

/**
 * Typed failure for the audit-log feature (US-E12.12).
 * The `type` key drives i18n (presentation translates; domain/repo/action never
 * do). `retryable` threads the BE `ApiError.retryable` signal through so a
 * BE-retryable 5xx (408/429/502/503/504) still gets the query's retry treatment
 * even when it maps to a non-transport failure type (`.claude/rules/api-integration.md`).
 */
export interface AuditLogFailure {
  type: AuditLogFailureType;
  /** Present when mapped from an ApiError; omitted for domain-side failures. */
  retryable?: boolean;
}

/**
 * Whether a failure should offer a retry. Prefers the threaded BE signal;
 * falls back to treating transport (`network-error`) failures as retryable
 * (covers domain-side failures with no `retryable` flag).
 */
export function isRetryableFailure(failure: AuditLogFailure): boolean {
  return failure.retryable ?? failure.type === "network-error";
}
