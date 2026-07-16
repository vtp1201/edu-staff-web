/**
 * Typed failure union for the class-log feature (US-E13.3).
 * Stable keys (the `type`) double as i18n keys under the `classLog.errors`
 * namespace — presentation translates, the domain/repo never does.
 */
export type ClassLogFailure =
  | { type: "not-found" }
  | { type: "already-exists" }
  | { type: "invalid-transition" }
  | { type: "summary-required" }
  | { type: "forbidden" }
  | { type: "unauthorized" }
  | { type: "network-error" }
  | { type: "unknown"; message?: string };
