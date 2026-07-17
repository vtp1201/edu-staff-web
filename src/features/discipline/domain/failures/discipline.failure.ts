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
  | { type: "forbidden" }
  | { type: "not-found" }
  | { type: "invalid-child" }
  | { type: "conflict" }
  // Ground-truthed against `edu-api/services/core/internal/conduct` (US-E18.14).
  // `same-actor` + `invalid-transition` come from the shared `ApprovalTransition`
  // domain service reused by violations/conduct-grades/leave alike (ADR 0073);
  // `locked` is the re-set-after-APPROVED conduct-grade rule (ADR 0074);
  // `student-not-enrolled` is a distinct leave-request business rule (a specific
  // 403, not the generic role/relationship `forbidden`).
  | { type: "same-actor" }
  | { type: "invalid-transition" }
  | { type: "locked" }
  | { type: "student-not-enrolled" }
  | { type: "network-error" };
