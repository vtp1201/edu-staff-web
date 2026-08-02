import { mockDelay } from "@/bootstrap/lib/mock";
import type { AttendanceDateRange } from "../../../domain/entities/attendance-date-range.entity";
import type { ChildAttendanceRecord } from "../../../domain/entities/child-attendance-record.entity";
import type { IChildAttendanceRepository } from "../../../domain/repositories/i-child-attendance.repository";
import { toChildAttendanceRecords } from "../../mappers/child-attendance.mapper";
import { buildMockAttendanceDto } from "./child-attendance-fixtures";

/**
 * The ONLY implementation of `IChildAttendanceRepository` today (US-E20.5).
 * `GET /members/{memberId}/attendance` authorizes STUDENT-self or ADMIN only —
 * a real repository here would 403 for every parent caller by design, so none
 * is written (a never-constructed "real" class is worse than an honest gap;
 * see `bootstrap/di/parent-attendance.di.ts`).
 *
 * It deliberately goes through the real DTO → mapper path so the un-mock diff
 * is limited to swapping the data source.
 */
export class MockChildAttendanceRepository
  implements IChildAttendanceRepository
{
  async getChildAttendance(
    childId: string,
    range: AttendanceDateRange,
  ): Promise<ChildAttendanceRecord[]> {
    await mockDelay();
    return toChildAttendanceRecords(buildMockAttendanceDto(childId, range));
  }
}
