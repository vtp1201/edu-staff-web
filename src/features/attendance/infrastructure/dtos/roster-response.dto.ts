import type { AttendanceStatus } from "../../domain/entities/attendance-status.entity";

export interface AttendanceRecordDto {
  studentId: string;
  studentName: string;
  studentCode: string;
  avatarUrl?: string;
  status: AttendanceStatus;
  note?: string;
}

export interface ClassPeriodDto {
  id: string;
  classId: string;
  className: string;
  subject: string;
  date: string;
  period: number;
}

export interface RosterResponseDto {
  period: ClassPeriodDto;
  records: AttendanceRecordDto[];
}
