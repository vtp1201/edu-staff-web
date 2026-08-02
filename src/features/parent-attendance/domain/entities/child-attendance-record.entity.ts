import type { AttendanceStatus } from "@/features/attendance/domain/entities/attendance-status.entity";

/**
 * One day's attendance for a single linked child. Mirrors the BE's
 * `MemberAttendanceDayRecord` (`services/core/docs/openapi.yaml`) minus
 * `classId`, which no UI surface needs yet — dropped in the mapper rather than
 * fabricated into the entity (same precedent as `attendance.mapper.ts`).
 *
 * `AttendanceStatus` is a type-only cross-feature import of a zero-dependency
 * string-literal union, keeping ONE canonical status vocabulary app-wide.
 */
export interface ChildAttendanceRecord {
  /** ISO `YYYY-MM-DD` */
  date: string;
  status: AttendanceStatus;
}
