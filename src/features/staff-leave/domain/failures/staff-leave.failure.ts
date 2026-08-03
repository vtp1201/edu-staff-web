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
  /**
   * A 400 the caller cannot fix by retrying: a bad list `cursor`/`status`
   * param, or core's domain backstop on an unrecognised approval state
   * (`LEAVE_REQUEST_INVALID_INPUT` off the reject path / `VIOLATION_INVALID_STATE`).
   * Deliberately NOT folded into `network-error`, whose copy offers a retry
   * that can never succeed (US-E18.36 review).
   */
  | { type: "invalid-request" }
  | { type: "network-error" };
