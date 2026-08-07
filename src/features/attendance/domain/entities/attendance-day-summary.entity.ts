import type { AttendanceStatus } from "./attendance-status.entity";

/** One day's aggregate for the history tab. Shape unchanged since ADR `0058` §5,
 *  but since US-E18.47 it is derived from ONE range call's flat records rather
 *  than a per-day client fan-out (BE US-187 added `startDate`/`endDate`). */
export interface AttendanceDaySummary {
  date: string;
  counts: Record<AttendanceStatus, number>;
  totalStudents: number;
}
