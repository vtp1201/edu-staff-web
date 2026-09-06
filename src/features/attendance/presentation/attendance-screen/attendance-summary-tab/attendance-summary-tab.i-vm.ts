import type { ClassAttendanceSummary } from "../../../domain/entities/student-attendance-summary.entity";
import type { AttendanceFailure } from "../../../domain/failures/attendance.failure";
import type {
  SummaryRange,
  SummaryRangeKind,
  SummaryTerm,
} from "../../../domain/resolve-summary-range";

/**
 * ViewModel contract for the "Tổng hợp chuyên cần" tab (US-E24.14).
 *
 * The BODY is a discriminated union — the four async states are mutually
 * exclusive by construction, so no render path can show a table over a failed
 * read or a skeleton after a terminal error.
 *
 * The CONTROLS are deliberately NOT part of that union: the range picker stays
 * usable while the body is loading, empty or failed — otherwise a teacher who
 * lands on a 403 or an empty month would have no way to pick another range.
 */
export type AttendanceSummaryVM =
  | { status: "loading" }
  | { status: "empty"; range: SummaryRange }
  | { status: "error"; errorKey: AttendanceFailure["type"] }
  | {
      status: "ready";
      range: SummaryRange;
      rangeKind: SummaryRangeKind;
      /** `null` (or empty) → the term/year segments are not offered at all:
       *  the academic calendar read is admin-shaped and a TEACHER may be
       *  refused it (packet Q1). A visible degrade, never a broken control. */
      availableTerms: SummaryTerm[] | null;
      summary: ClassAttendanceSummary;
    };

/** What the range controls render from, in every body state. */
export interface SummaryControlsVM {
  rangeKind: SummaryRangeKind;
  /** `YYYY-MM` — the month segment's applied value. */
  month: string;
  /** Applied term of the active year, or `null` when none is resolvable. */
  termId: string | null;
  /** `null`/empty → hide the term + year segments (see the VM union). */
  availableTerms: SummaryTerm[] | null;
}

/** A neutral, non-error notice shown above the body.
 *  - `no-terms`: the academic calendar is unavailable → month-only.
 *  - `range-too-large`: >366 days, refused client-side before any wire call. */
export type SummaryNotice = "no-terms" | "range-too-large";
