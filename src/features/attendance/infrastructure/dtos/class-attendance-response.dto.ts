/** `POST/GET /core/api/v1/classes/{classId}/attendance` shape — ground-truthed
 *  against `edu-api/services/core/internal/attendance` Go source (2026-07-18,
 *  ADR `0058`). Daily, class-wide, no period/subject axis. */
export type WireAttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "EXCUSED_ABSENT";

export interface AttendanceRecordDto {
  studentMemberId: string;
  status: WireAttendanceStatus;
}

export interface ClassAttendanceResponseDto {
  classId: string;
  date: string;
  records: AttendanceRecordDto[];
}
