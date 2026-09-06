import type { AttendanceDaySummary } from "../../domain/entities/attendance-day-summary.entity";
import type { AttendanceRecord } from "../../domain/entities/attendance-record.entity";
import type { AttendanceRoster } from "../../domain/entities/attendance-roster.entity";
import type { ClassAttendanceSummary } from "../../domain/entities/student-attendance-summary.entity";
import type { AttendanceFailure } from "../../domain/failures/attendance.failure";
import type { ClassSummary } from "../../domain/repositories/i-attendance.repository";
import type { SummaryYear } from "../../domain/resolve-summary-range";

export interface AttendanceFilterValues {
  classId?: string;
  date?: string;
}

export type AttendanceActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; errorKey: AttendanceFailure["type"] }
  : { ok: true; data: T } | { ok: false; errorKey: AttendanceFailure["type"] };

export interface AttendanceScreenVM {
  classes: ClassSummary[];
  roster: AttendanceRoster | null;
  filters: AttendanceFilterValues;
  saveAction: (
    classId: string,
    date: string,
    records: AttendanceRecord[],
  ) => Promise<AttendanceActionResult>;
  getHistoryAction: (
    classId: string,
    from: string,
    to: string,
  ) => Promise<AttendanceActionResult<AttendanceDaySummary[]>>;
  /** Per-student rollup for the summary tab (US-E24.14) — same
   *  `AttendanceActionResult` contract as the history read. */
  getSummaryAction: (
    classId: string,
    from: string,
    to: string,
  ) => Promise<AttendanceActionResult<ClassAttendanceSummary>>;
  /** Academic calendar behind the term/year segments. Resolves to `null` when
   *  it cannot be read (a TEACHER may be refused this admin-shaped endpoint) —
   *  the tab then offers the month range only. */
  getTermsAction: () => Promise<SummaryYear[] | null>;
}
