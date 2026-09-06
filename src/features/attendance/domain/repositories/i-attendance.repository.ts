import type { AttendanceDaySummary } from "../entities/attendance-day-summary.entity";
import type { AttendanceRecord } from "../entities/attendance-record.entity";
import type { AttendanceRoster } from "../entities/attendance-roster.entity";
import type {
  ClassAttendanceRangeRecord,
  ClassRosterEntry,
} from "../summarize-class-attendance";

export interface ClassSummary {
  id: string;
  name: string;
}

/**
 * What one un-capped range read answers (US-E24.14): the class ROSTER (the row
 * set, names already joined) plus every attendance record in the window.
 *
 * Both halves are needed and neither derives the other: a student with no
 * record in the range exists only in the roster, and the roster is what gives a
 * record its display name. Joining them repository-side keeps the name/ordinal
 * fallback in ONE place (mirroring `getClassAttendance`'s `nameByMemberId`
 * join) and leaves the use-case a thin `summarizeClassAttendance()` call.
 */
export interface ClassAttendanceRangeResult {
  roster: ClassRosterEntry[];
  records: ClassAttendanceRangeRecord[];
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
   *  for the clamp and `attendance.mapper.ts#aggregateRangeDaySummaries` for the
   *  per-day rollup this delegates to. Since US-E18.47 the real implementation
   *  costs ONE range call (BE US-187), not one call per day (ADR `0058` §5). */
  getAttendanceHistory(
    classId: string,
    from: string,
    to: string,
  ): Promise<AttendanceDaySummary[]>;
  /**
   * Un-capped (≤366 days, the BE's own ceiling) range read for the per-student
   * summary tab — a SIBLING of `getAttendanceHistory`, not a widening of it.
   * History stays bounded at `MAX_HISTORY_DAYS` (ADR `0058` §5) and projects
   * per DAY; this one spans a term/year and projects per STUDENT. Same route,
   * same params, different projection — so raising one bound can never quietly
   * change the other screen.
   */
  getClassAttendanceRange(
    classId: string,
    from: string,
    to: string,
  ): Promise<ClassAttendanceRangeResult>;
}
