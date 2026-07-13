/** One week's school-wide attendance rate (INT-003, last 6 weeks). */
export interface AttendanceTrendPointEntity {
  weekLabel: string;
  /** Attendance percentage, e.g. 96.4. */
  rate: number;
}
