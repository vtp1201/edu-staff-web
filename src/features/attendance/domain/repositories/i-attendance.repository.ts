import type { AttendanceDaySummary } from "../entities/attendance-day-summary.entity";
import type { AttendanceRecord } from "../entities/attendance-record.entity";
import type { AttendanceRoster } from "../entities/attendance-roster.entity";

export interface ClassSummary {
  id: string;
  name: string;
}

export interface IAttendanceRepository {
  /** Homeroom (GVCN) classes only — reuses the class-list endpoint filtered
   *  to `homeroomTeacherId === currentUserId` (no dedicated endpoint, ADR `0058` §4). */
  getMyHomeroomClasses(): Promise<ClassSummary[]>;
  getClassAttendance(classId: string, date: string): Promise<AttendanceRoster>;
  saveClassAttendance(
    classId: string,
    date: string,
    records: AttendanceRecord[],
  ): Promise<void>;
  /** Bounded (≤31 days) aggregate — see `list-attendance-history.use-case.ts`
   *  for the clamp and `attendance.mapper.ts#aggregateDaySummaries` for the
   *  fan-out aggregation this delegates to (ADR `0058` §5). */
  getAttendanceHistory(
    classId: string,
    from: string,
    to: string,
  ): Promise<AttendanceDaySummary[]>;
}
