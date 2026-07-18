import type { AttendanceDaySummary } from "../../domain/entities/attendance-day-summary.entity";
import type { AttendanceRecord } from "../../domain/entities/attendance-record.entity";
import type { AttendanceRoster } from "../../domain/entities/attendance-roster.entity";
import type { AttendanceFailure } from "../../domain/failures/attendance.failure";
import type { ClassSummary } from "../../domain/repositories/i-attendance.repository";

export interface AttendanceFilterValues {
  classId?: string;
  date?: string;
}

export type AttendanceActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; errorKey: AttendanceFailure["type"] }
  : { ok: true; data: T } | { ok: false; errorKey: AttendanceFailure["type"] };

export interface AttendanceScreenVM {
  classes: ClassSummary[];
  roster: AttendanceRoster | null;
  filters: AttendanceFilterValues;
  saveAction: (
    classId: string,
    date: string,
    records: AttendanceRecord[],
  ) => Promise<AttendanceActionResult>;
  getHistoryAction: (
    classId: string,
    from: string,
    to: string,
  ) => Promise<AttendanceActionResult<AttendanceDaySummary[]>>;
}
