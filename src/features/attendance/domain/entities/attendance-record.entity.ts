import type { AttendanceStatus } from "./attendance-status.entity";

/** `studentCode`/`avatarUrl` dropped — no wire source (ADR `0058` §3). */
export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  /** UI-local only — no wire source yet, unchanged from the mock-first model. */
  note?: string;
}
