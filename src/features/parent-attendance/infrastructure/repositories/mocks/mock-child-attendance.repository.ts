import "server-only";

import { mockDelay } from "@/bootstrap/lib/mock";
import type { AttendanceDateRange } from "../../../domain/entities/attendance-date-range.entity";
import type { ChildAttendanceRecord } from "../../../domain/entities/child-attendance-record.entity";
import type { IChildAttendanceRepository } from "../../../domain/repositories/i-child-attendance.repository";
import { toChildAttendanceRecords } from "../../mappers/child-attendance.mapper";
import { buildMockAttendanceDto } from "./child-attendance-fixtures";

/**
 * Development-only implementation of `IChildAttendanceRepository` (US-E20.5),
 * reached ONLY when `NEXT_PUBLIC_USE_MOCK === "true"`. A real environment gets
 * `ChildAttendanceRepository` (US-E18.34) — this must never become a real-mode
 * fallback, because fabricated attendance for a parent's real child is data a
 * parent could act on (see `bootstrap/di/parent-attendance.di.ts`).
 *
 * It goes through the real DTO → mapper path (wire-cased fixtures included), so
 * the mock and the real repository are proven by the same mapper.
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
