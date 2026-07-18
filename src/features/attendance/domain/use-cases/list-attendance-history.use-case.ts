import { daysInclusive } from "../date-range";
import type { AttendanceDaySummary } from "../entities/attendance-day-summary.entity";
import type { AttendanceFailure } from "../failures/attendance.failure";
import type { IAttendanceRepository } from "../repositories/i-attendance.repository";

/** Bounded to cap fan-out cost — well under the BE's own 366-day
 *  `ATTENDANCE_DATE_RANGE_TOO_LARGE` ceiling (ADR `0058` §5). Rejects
 *  out-of-bound requests (never silently truncates — see ADR §5). */
export const MAX_HISTORY_DAYS = 31;

export class ListAttendanceHistoryUseCase {
  constructor(private readonly repo: IAttendanceRepository) {}

  execute(
    classId: string,
    from: string,
    to: string,
  ): Promise<AttendanceDaySummary[]> {
    if (daysInclusive(from, to) > MAX_HISTORY_DAYS) {
      throw { type: "invalid-request" } satisfies AttendanceFailure;
    }
    return this.repo.getAttendanceHistory(classId, from, to);
  }
}
