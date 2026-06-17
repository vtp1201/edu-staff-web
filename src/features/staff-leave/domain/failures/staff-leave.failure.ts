/**
 * Typed failure union for the staff-leave feature (US-E09.3).
 * The `type` keys double as i18n keys under the `staffLeave.errors` namespace —
 * presentation translates, the domain/repo/action never does.
 */
export type StaffLeaveFailure =
  | { type: "not-found" }
  | { type: "already-processed" }
  | { type: "reason-too-short" }
  | { type: "missing-reject-reason" }
  | { type: "network-error" };
