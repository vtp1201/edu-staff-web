import { daysInclusive } from "../date-range";
import type { ClassAttendanceSummary } from "../entities/student-attendance-summary.entity";
import type { AttendanceFailure } from "../failures/attendance.failure";
import type { IAttendanceRepository } from "../repositories/i-attendance.repository";
import { MAX_SUMMARY_RANGE_DAYS } from "../resolve-summary-range";
import { summarizeClassAttendance } from "../summarize-class-attendance";

/**
 * Per-student attendance rollup over a range (US-E24.14).
 *
 * The ≤366-day bound is the BE's own (`ATTENDANCE_DATE_RANGE_TOO_LARGE`) and is
 * re-checked HERE, not just in the presentation resolver: the client-side check
 * keeps the UI from making a doomed request, this one keeps a hand-crafted
 * Server-Action call from reaching the wire. Rejects, never truncates — the
 * same posture `ListAttendanceHistoryUseCase` takes for its own (much tighter,
 * unrelated) 31-day cap.
 */
export class SummarizeClassAttendanceUseCase {
  constructor(private readonly repo: IAttendanceRepository) {}

  async execute(
    classId: string,
    from: string,
    to: string,
  ): Promise<ClassAttendanceSummary> {
    if (daysInclusive(from, to) > MAX_SUMMARY_RANGE_DAYS) {
      throw { type: "invalid-request" } satisfies AttendanceFailure;
    }
    const { roster, records } = await this.repo.getClassAttendanceRange(
      classId,
      from,
      to,
    );
    return summarizeClassAttendance(records, roster);
  }
}
