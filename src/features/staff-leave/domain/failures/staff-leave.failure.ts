/**
 * Typed failure union for the staff-leave feature (US-E09.3).
 * The `type` keys double as i18n keys under the `staffLeave.errors` namespace —
 * presentation translates, the domain/repo/action never does.
 *
 * `forbidden` / `same-actor` added (US-E18.8) to complete the ground-truthed
 * real error matrix (`LEAVE_REQUEST_FORBIDDEN` / `VIOLATION_SAME_ACTOR`) —
 * unreachable today since the repository is force-mocked (see
 * `staff-leave.repository.ts`), kept for the day BE unblocks this feature.
 */
export type StaffLeaveFailure =
  | { type: "not-found" }
  | { type: "already-processed" }
  | { type: "reason-too-short" }
  | { type: "missing-reject-reason" }
  | { type: "forbidden" }
  | { type: "same-actor" }
  | { type: "network-error" };
