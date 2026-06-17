/**
 * Typed failure union for the discipline feature (US-E09.1).
 * The `type` keys double as i18n keys under the `discipline.errors` namespace —
 * presentation translates, the domain/repo/action never does.
 */
export type DisciplineFailure =
  | { type: "missing-student" }
  | { type: "missing-description" }
  | { type: "missing-reject-reason" }
  | { type: "already-processed" }
  | { type: "invalid-severity" }
  | { type: "invalid-conduct-grade" }
  | { type: "invalid-date" }
  | { type: "reason-too-short" }
  | { type: "network-error" };
