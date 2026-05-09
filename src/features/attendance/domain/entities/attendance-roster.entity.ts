import type { AttendanceRecord } from "./attendance-record.entity";
import type { ClassPeriod } from "./class-period.entity";

export interface AttendanceRoster {
  period: ClassPeriod;
  records: AttendanceRecord[];
}
