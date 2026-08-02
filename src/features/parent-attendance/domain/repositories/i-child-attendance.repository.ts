import type { AttendanceDateRange } from "../entities/attendance-date-range.entity";
import type { ChildAttendanceRecord } from "../entities/child-attendance-record.entity";

/**
 * Throwing-repo convention (same as `IGradeBookRepository`): resolves with the
 * records, rejects with a `ParentAttendanceFailure`-shaped object.
 */
export interface IChildAttendanceRepository {
  getChildAttendance(
    childId: string,
    range: AttendanceDateRange,
  ): Promise<ChildAttendanceRecord[]>;
}
