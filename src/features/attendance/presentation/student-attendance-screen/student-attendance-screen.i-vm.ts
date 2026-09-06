import type { AbsenceHistoryRow } from "@/features/attendance/domain/entities/absence-history-row.entity";
import type {
  AttendanceSummary,
  MonthlyRollup,
} from "@/features/attendance/domain/entities/attendance-summary.entity";
import type { AttendanceDateRange } from "@/features/parent-attendance/domain/entities/attendance-date-range.entity";
import type { ParentAttendanceFailure } from "@/features/parent-attendance/domain/failures/parent-attendance.failure";

/**
 * `/student/attendance` view-model (US-E24.6).
 *
 * A DISCRIMINATED UNION, not a flat object with nullable fields: a `forbidden`
 * session has no range, no summary and no history, and the union makes
 * "rendered a summary for a session that has no student identity" a compile
 * error rather than a runtime `0/0` card.
 *
 * `forbidden` here means specifically "this token carries no `memberId` claim"
 * (decision `0074`) — the screen never even asked the server, so it is not the
 * BE's 403 (that one arrives as `status: "error"` with `errorKey: "forbidden"`).
 */
export type StudentAttendanceScreenVM =
  | { status: "forbidden" }
  | {
      status: "error";
      range: AttendanceDateRange;
      errorKey: ParentAttendanceFailure["type"];
    }
  | {
      status: "ready";
      range: AttendanceDateRange;
      summary: AttendanceSummary;
      months: MonthlyRollup[];
      history: AbsenceHistoryRow[];
    };
