import type { AttendanceRecord } from "./attendance-record.entity";
import type { ClassDate } from "./class-date.entity";

export interface AttendanceRoster {
  classDate: ClassDate;
  records: AttendanceRecord[];
}
