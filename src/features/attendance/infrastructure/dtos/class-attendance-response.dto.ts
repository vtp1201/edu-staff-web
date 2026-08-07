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

/** Range mode (US-E18.47 / BE US-187): the SAME route answers
 *  `ClassAttendanceRangeResponse` when called with `startDate`+`endDate`
 *  instead of `date`. Records carry their own `date` (the response is flat,
 *  ordered by `(date, studentMemberId)` ascending) and days with no record at
 *  all are simply absent — there is no per-day placeholder. */
export interface ClassAttendanceRangeRecordDto {
  date: string;
  studentMemberId: string;
  status: WireAttendanceStatus;
}

export interface ClassAttendanceRangeResponseDto {
  classId: string;
  records: ClassAttendanceRangeRecordDto[];
}
