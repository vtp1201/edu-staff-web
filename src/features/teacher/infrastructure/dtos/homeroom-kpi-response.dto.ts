/**
 * Narrow wire shapes the GVCN KPI tiles need — deliberately minimal and LOCAL
 * to the teacher feature: `features/discipline`'s DTOs model a much fuller
 * record and belong to a permanently force-mocked repository (US-E18.14), so
 * they are NOT reused here.
 */

/** draft US-245 — `GET /core/api/v1/classes/{classId}/attendance/summary?termId=`
 *  (`AttendanceSummary`). `rate` is a STRING "0.00".."1.00", `""` when the term
 *  has no recorded day. Not deployed; see `teacher-class.repository.ts` for why
 *  the real call is not wired (no term source on the web today). */
export interface AttendanceSummaryResponseDto {
  presentDays?: number;
  absentDays?: number;
  lateDays?: number;
  excusedDays?: number;
  recordedDays?: number;
  rate: string;
}

/** `GET /core/api/v1/conduct/student-violations?classId=` item — the GVCN sees
 *  EVERY workflow state (there is no `state` query param), so "chờ xử lý" is a
 *  client-side count of `SUBMITTED`. Only `state` is read. */
export interface ViolationStateResponseDto {
  state: string;
}

/** `GET /core/api/v1/conduct/student-leave-requests?classId=` item — for a GVCN
 *  caller the page is ALREADY server-filtered to `SUBMITTED` (homeroom inbox),
 *  so the pending count is simply the drained page length. */
export interface LeaveRequestStateResponseDto {
  requestId: string;
  state: string;
}
