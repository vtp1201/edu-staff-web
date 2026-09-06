/**
 * Client-computed attendance rollups for the student / parent attendance
 * portal (US-E24.6).
 *
 * There is no BE aggregate endpoint: `GET /core/api/v1/members/{id}/attendance`
 * returns per-DAY records and the summary block is derived from them (design-
 * spec `student-attendance.api`). These types therefore live in `domain/` and
 * are produced by the pure `summarizeAttendance()` — nothing here is a wire
 * shape.
 *
 * VOCABULARY DEVIATION (packet §Product Contract): the mockup counts "tiết"
 * (periods). Core records attendance per DAY, so every count here is a number
 * of *buổi/ngày*. The i18n copy says "buổi"; the numbers must not be re-labelled
 * as periods.
 */
export interface AttendanceSummary {
  /** Every recorded day in the range, whatever its status. */
  total: number;
  presentCount: number;
  /**
   * Days marked LATE. Kept in `total` (they are recorded school days) but
   * deliberately OUT of the `rate` numerator — BE US-245 semantics: a late day
   * is not a present day.
   */
  lateCount: number;
  /** `excusedAbsent` — "vắng có phép". */
  excusedCount: number;
  /** `absent` — "vắng không phép". */
  unexcusedCount: number;
  /**
   * `presentCount / total` as a percentage 0–100, one decimal.
   *
   * `null` when `total === 0`: a rate over no days does not exist. The
   * presentation renders `null` as an em-dash — NEVER `0%`, which would read as
   * "this student attended nothing".
   */
  rate: number | null;
}

/** One `YYYY-MM` bucket of {@link AttendanceSummary}. Months with zero recorded
 *  days are OMITTED from the list rather than emitted as an empty 0% row. */
export interface MonthlyRollup {
  /** ISO `YYYY-MM`. */
  month: string;
  total: number;
  presentCount: number;
  /** "P" in the design's `<n>P <n>KP <rate>%` row. */
  excusedCount: number;
  /** "KP" in the same row. */
  unexcusedCount: number;
  /** Same definition and `null` semantics as {@link AttendanceSummary.rate}. */
  rate: number | null;
}

/** What `summarizeAttendance()` answers: the whole range plus its months. */
export interface AttendanceRollup {
  summary: AttendanceSummary;
  months: MonthlyRollup[];
}
