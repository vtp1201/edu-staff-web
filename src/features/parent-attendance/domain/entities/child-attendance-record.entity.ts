import type { AttendanceStatus } from "@/features/attendance/domain/entities/attendance-status.entity";

/**
 * One day's attendance for a single linked child. Mirrors the BE's
 * `MemberAttendanceDayRecord` (`services/core/docs/openapi.yaml`).
 *
 * `AttendanceStatus` is a type-only cross-feature import of a zero-dependency
 * string-literal union, keeping ONE canonical status vocabulary app-wide.
 */
export interface ChildAttendanceRecord {
  /** ISO `YYYY-MM-DD` */
  date: string;
  status: AttendanceStatus;
  /**
   * The class the day was recorded against.
   *
   * US-E20.5 deliberately dropped it ("no UI surface needs it"); US-E24.6
   * un-drops it because one now does: a PARENT submitting a leave request must
   * send the child's `classId` in the body, and no endpoint lets a PARENT
   * discover it (ask #15/#22). Reading it off the most recent attendance row
   * the screen ALREADY fetched beats a fabricated second read (packet Q3).
   *
   * OPTIONAL, not required: the field is additive for US-E20.5's shipped
   * callers, and a row the wire sent without one must stay honestly absent
   * rather than become `""`.
   */
  classId?: string;
}
