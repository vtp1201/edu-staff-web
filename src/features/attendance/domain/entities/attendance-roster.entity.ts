import type { AttendanceRecord } from "./attendance-record.entity";
import type { ClassDate } from "./class-date.entity";

export interface AttendanceRoster {
  classDate: ClassDate;
  records: AttendanceRecord[];
  /**
   * Has this day actually been rolled? `records` alone cannot answer it: the
   * mapper seeds every enrolled student as `present` so the mark-attendance
   * screen has editable rows, which makes an untouched day look identical to
   * "everyone present". Sourced from whether the wire returned ANY saved record
   * (US-E24.11) — the class-hub homeroom card needs the distinction to say
   * "Chưa điểm danh" instead of reporting a full house nobody counted.
   */
  taken: boolean;
}
