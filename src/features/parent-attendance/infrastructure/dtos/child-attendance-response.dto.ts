import type { WireAttendanceStatus } from "@/features/attendance/infrastructure/dtos/class-attendance-response.dto";

/**
 * Wire shape of `GET /core/api/v1/members/{memberId}/attendance`
 * (`MemberAttendanceResponse` / `MemberAttendanceDayRecord`,
 * `edu-api/services/core/docs/openapi.yaml`) — ground-truthed for US-E18.34
 * against the Go source of truth
 * (`services/core/internal/attendance/adapter/http/dto/attendance.go`, json
 * tags `memberId` / `records` / `date` / `classId` / `status`).
 *
 * `status` is the UPPER_SNAKE wire enum, NOT the domain casing: US-E20.5 (this
 * DTO's first draft, written while the endpoint was believed unreachable for a
 * PARENT) typed it as the domain `AttendanceStatus`, which would have leaked
 * raw `"PRESENT"` strings into the UI on the first real call. `WireAttendanceStatus`
 * is reused from `features/attendance` rather than re-declared so one attendance
 * vocabulary stays app-wide (same cross-feature precedent as
 * `tenant.repository.ts` importing `features/auth`'s mapper).
 */
export interface ChildAttendanceDayRecordDto {
  /** ISO `YYYY-MM-DD` */
  date: string;
  classId: string;
  status: WireAttendanceStatus;
}

export interface ChildAttendanceResponseDto {
  memberId: string;
  records: ChildAttendanceDayRecordDto[];
}
