/**
 * Typed failure union for admin parent-student-link flows (US-E20.1).
 *
 * - `validation` — 422, per-field errors (e.g. parent not parent-role, FR-004/E2).
 * - `already-linked` — duplicate (studentId, parentId) pair rejected (FR-004).
 * - `not-found` — 404 race: link already removed by a concurrent action (AC-005.7).
 * - `forbidden` — 403: server-side role/tenant re-authorization rejected the
 *   caller. Load-bearing for the high-risk Unlink AC (AC-005.5/.6) — branch on
 *   error.code, never message.
 * - `network-error` — transport / 5xx / timeout (the only retryable type).
 */
export type ParentStudentLinkFailure =
  | { type: "validation"; fields: { field: string; message: string }[] }
  | { type: "already-linked" }
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "network-error" };

/** Only transport/5xx failures are retryable (state-architecture §4). */
export function isRetryableFailure(failure: ParentStudentLinkFailure): boolean {
  return failure.type === "network-error";
}
