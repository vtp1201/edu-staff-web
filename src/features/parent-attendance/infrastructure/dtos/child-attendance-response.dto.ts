import type { AttendanceStatus } from "@/features/attendance/domain/entities/attendance-status.entity";

/**
 * Wire shape of `GET /members/{memberId}/attendance`
 * (`MemberAttendanceResponse` / `MemberAttendanceDayRecord`,
 * `edu-api/services/core/docs/openapi.yaml`). Declared contract-correct even
 * though no real repository consumes it yet — PARENT is not in that endpoint's
 * authorization list today (see `bootstrap/di/parent-attendance.di.ts`), so
 * this DTO exists to make the eventual un-mock a small diff.
 */
export interface ChildAttendanceDayRecordDto {
  /** ISO `YYYY-MM-DD` */
  date: string;
  classId: string;
  status: AttendanceStatus;
}

export interface ChildAttendanceResponseDto {
  memberId: string;
  records: ChildAttendanceDayRecordDto[];
}
