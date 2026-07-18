import type { AttendanceStatus } from "./attendance-status.entity";

/** One day's aggregate for the history tab (no bulk range endpoint exists —
 *  ADR `0058` §5; this is the bounded client-side fan-out's output shape). */
export interface AttendanceDaySummary {
  date: string;
  counts: Record<AttendanceStatus, number>;
  totalStudents: number;
}
