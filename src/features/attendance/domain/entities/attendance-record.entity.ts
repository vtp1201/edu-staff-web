import type { AttendanceStatus } from "./attendance-status.entity";

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  studentCode: string;
  avatarUrl?: string;
  status: AttendanceStatus;
  note?: string;
}
