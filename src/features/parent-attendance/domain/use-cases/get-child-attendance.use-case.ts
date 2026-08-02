import { daysInclusive } from "../date-range";
import type { AttendanceDateRange } from "../entities/attendance-date-range.entity";
import type { ChildAttendanceRecord } from "../entities/child-attendance-record.entity";
import type { ParentAttendanceFailure } from "../failures/parent-attendance.failure";
import type { IChildAttendanceRepository } from "../repositories/i-child-attendance.repository";

/** BE's documented cap on `GET /members/{memberId}/attendance` (inclusive). */
export const MAX_RANGE_DAYS = 366;

export type GetChildAttendanceResult =
  | { ok: true; data: ChildAttendanceRecord[] }
  | { ok: false; error: ParentAttendanceFailure };

function toFailure(err: unknown): ParentAttendanceFailure {
  if (err && typeof err === "object" && "type" in err) {
    return err as ParentAttendanceFailure;
  }
  return { type: "network-error" };
}

/**
 * Parent-facing per-child attendance history (US-E20.5). Range validation runs
 * HERE, not in the repository, so the mock and the (future) real repository
 * behave identically — the BE rejects the same two cases with
 * `ATTENDANCE_INVALID_DATE_RANGE` / `ATTENDANCE_DATE_RANGE_TOO_LARGE`.
 */
export class GetChildAttendanceUseCase {
  constructor(private readonly repo: IChildAttendanceRepository) {}

  async execute(
    childId: string,
    range: AttendanceDateRange,
  ): Promise<GetChildAttendanceResult> {
    if (range.endDate < range.startDate) {
      return { ok: false, error: { type: "invalid-date-range" } };
    }
    if (daysInclusive(range.startDate, range.endDate) > MAX_RANGE_DAYS) {
      return { ok: false, error: { type: "date-range-too-large" } };
    }
    try {
      return {
        ok: true,
        data: await this.repo.getChildAttendance(childId, range),
      };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }
}
