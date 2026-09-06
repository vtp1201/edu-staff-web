/**
 * One line of the "Lịch sử vắng mặt" card (US-E24.6).
 *
 * Three kinds, three sources:
 * - `absent` / `excused` — a recorded attendance DAY (`absent` /
 *   `excusedAbsent`), optionally carrying the reason of an APPROVED leave
 *   request that covers it.
 * - `pending` — a SUBMITTED leave request that has not been decided yet. It is
 *   NOT a recorded day: it is the parent's/student's own request, shown at the
 *   top of the list so "I just sent it" has visible feedback (AC: "hàng pending
 *   xuất hiện đầu lịch sử").
 *
 * The design mockup's `period` / `subject` columns have NO source: core records
 * attendance per DAY, not per period (packet deviation note). They are omitted
 * rather than filled with a placeholder.
 */
export type AbsenceHistoryKind = "absent" | "excused" | "pending";

export interface AbsenceHistoryRow {
  /** Stable, unique — safe as a React `key` (never an array index). */
  key: string;
  /** ISO `YYYY-MM-DD`. For `pending`, the request's FIRST day. */
  date: string;
  /**
   * ISO `YYYY-MM-DD` end of a `pending` request's range (equal to `date` for a
   * one-day request). `null` for a recorded day, which spans exactly one date.
   */
  endDate: string | null;
  kind: AbsenceHistoryKind;
  /**
   * Free text from the leave request; `null` when no request explains this day.
   * The presentation renders `null` as the design's explicit "Chưa có lý do"
   * line — never as an empty gap.
   */
  reason: string | null;
}
