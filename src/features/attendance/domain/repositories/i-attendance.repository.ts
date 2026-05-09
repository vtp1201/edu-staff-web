import type { AttendanceRecord } from "../entities/attendance-record.entity";
import type { AttendanceRoster } from "../entities/attendance-roster.entity";
import type { ClassPeriod } from "../entities/class-period.entity";

export interface ClassSummary {
  id: string;
  name: string;
}

export interface IAttendanceRepository {
  listMyClasses(): Promise<ClassSummary[]>;
  getRoster(
    classId: string,
    date: string,
    period: number,
  ): Promise<AttendanceRoster>;
  saveAttendance(periodId: string, records: AttendanceRecord[]): Promise<void>;
  listHistory(
    classId: string,
    from: string,
    to: string,
  ): Promise<ClassPeriod[]>;
}
