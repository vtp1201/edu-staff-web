/**
 * Failure union for the parent-facing child attendance read.
 *
 * `invalid-date-range` / `date-range-too-large` mirror the BE's documented
 * `ATTENDANCE_INVALID_DATE_RANGE` / `ATTENDANCE_DATE_RANGE_TOO_LARGE` on
 * `GET /members/{memberId}/attendance`, enforced client-side in the use-case so
 * the behaviour is identical the day the endpoint is un-mocked.
 * `forbidden` is the honest degrade for the current BE gap (PARENT is absent
 * from that endpoint's authorization list).
 */
export type ParentAttendanceFailure =
  | { type: "forbidden" }
  | { type: "invalid-date-range" }
  | { type: "date-range-too-large" }
  | { type: "network-error" }
  | { type: "unknown" };
