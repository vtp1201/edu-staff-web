/**
 * Failure union for the parent-facing child attendance read.
 *
 * `invalid-date-range` / `date-range-too-large` mirror the BE's
 * `ATTENDANCE_INVALID_DATE_RANGE` / `ATTENDANCE_DATE_RANGE_TOO_LARGE` on
 * `GET /members/{memberId}/attendance`; the use-case enforces both client-side
 * FIRST so an obviously invalid range costs no round-trip, and the repository
 * maps the wire codes for the case where the two rules ever drift.
 * `forbidden` is the BE's `403 ATTENDANCE_FORBIDDEN` — since US-E18.34 that
 * means a genuine authorization answer (the parent is not linked to this
 * child), not the placeholder degrade US-E20.5 shipped.
 */
export type ParentAttendanceFailure =
  | { type: "forbidden" }
  | { type: "invalid-date-range" }
  | { type: "date-range-too-large" }
  | { type: "network-error" }
  | { type: "unknown" };
