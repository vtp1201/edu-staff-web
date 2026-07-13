/**
 * Typed failure union for the principal-reports feature. Repositories throw
 * one of these; Server Actions catch and surface `errorKey` (never a
 * translated string, per i18n.md boundary rule).
 */
export type PrincipalReportsFailure =
  | { type: "network-error" }
  | { type: "term-not-found" }
  | { type: "generation-failed" }
  | { type: "unauthorized" }
  | { type: "unknown"; message?: string };
