import type { AttendanceRecord } from "../../domain/entities/attendance-record.entity";
import type { AttendanceRoster } from "../../domain/entities/attendance-roster.entity";
import type { ClassPeriod } from "../../domain/entities/class-period.entity";
import type { ClassSummary } from "../../domain/repositories/i-attendance.repository";

export interface AttendanceFilterValues {
  classId?: string;
  date?: string;
  period?: string;
}

export interface AttendanceScreenVM {
  classes: ClassSummary[];
  roster: AttendanceRoster | null;
  history: ClassPeriod[];
  filters: AttendanceFilterValues;
  saveAction: (
    periodId: string,
    records: AttendanceRecord[],
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
}
