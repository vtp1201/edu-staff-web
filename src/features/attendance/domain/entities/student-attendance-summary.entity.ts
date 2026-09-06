/**
 * Per-student attendance rollup over an arbitrary range — the "Tổng hợp chuyên
 * cần" tab of `/teacher/attendance` (US-E24.14).
 *
 * There is no BE per-student aggregate for an arbitrary range: core answers the
 * flat `GET /classes/{id}/attendance?startDate&endDate` record list and the
 * per-student numbers are derived from it by the pure
 * `summarizeClassAttendance()`. Nothing here is a wire shape.
 *
 * VOCABULARY (same deviation `attendance-summary.entity.ts` documents): core
 * records attendance per DAY, so every count is a number of *buổi/ngày*, never
 * "tiết"/periods — the mockup's period wording must not come back with these
 * numbers.
 */

/** Threshold band a student's `rate` falls into (design-spec thresholds card):
 *  `ok` ≥ 95%, `watch` ≥ 90%, `risk` below. `null` when there is no rate at
 *  all — an unranked student, NOT a failing one. */
export type AttendanceBand = "ok" | "watch" | "risk";

export interface StudentAttendanceSummary {
  studentId: string;
  /** Roster display name (joined repository-side, ordinal fallback). */
  name: string;
  present: number;
  /**
   * Days marked LATE. Counted in {@link recorded} (a late day IS a recorded
   * school day) but deliberately OUT of the `rate` numerator — the same rule
   * `AttendanceSummary` documents for BE US-245.
   */
  late: number;
  /** `excusedAbsent` — "vắng có phép". */
  excused: number;
  /** `absent` — "vắng không phép". */
  absent: number;
  /** Every day this student has a record for, whatever its status. */
  recorded: number;
  /**
   * `present / recorded` as a percentage 0–100, one decimal.
   *
   * `null` when `recorded === 0`: a rate over no days does not exist. The
   * table renders `null` as an em-dash — NEVER `0%`, which would read as "this
   * student attended nothing".
   */
  rate: number | null;
  /** `null` exactly when {@link rate} is `null` (no chip is rendered). */
  band: AttendanceBand | null;
}

export interface ClassAttendanceSummary {
  /** One row per ROSTER entry, in roster order (the table's default STT sort).
   *  A student with no record in the range still gets a row. */
  students: StudentAttendanceSummary[];
  /**
   * Mean of the per-student rates, over students with `recorded > 0` ONLY.
   * Zero-record students would otherwise drag the class average toward a
   * number nobody's attendance produced. `null` when nobody has a record.
   */
  meanRate: number | null;
}
