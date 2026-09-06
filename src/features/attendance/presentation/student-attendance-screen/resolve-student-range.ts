import type {
  TermWindow,
  YearWindow,
} from "@/features/attendance/domain/entities/academic-window.entity";
import type { AttendanceDateRange } from "@/features/parent-attendance/domain/entities/attendance-date-range.entity";

/**
 * Which range `/student/attendance` reads (US-E24.6, packet Q1).
 *
 * Preferred: the CURRENT TERM of the active academic year, so the summary
 * matches what a student thinks of as "this semester". That read
 * (`GET /academic-years`) is admin-shaped and a STUDENT may well get a 403 —
 * hence {@link fallbackRange}, which needs no server at all. The caller tries
 * the calendar first and falls back on ANY failure; the applied range is shown
 * in the subtitle either way, so the number is never unexplained.
 *
 * The parameter is a STRUCTURAL shape, not `AcademicYear` from
 * `features/admin/calendar`: this module has no business depending on the admin
 * calendar feature, and the two fields it reads are all it needs.
 */
export type {
  TermWindow,
  YearWindow,
} from "@/features/attendance/domain/entities/academic-window.entity";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `GET /members/{id}/attendance` refuses a range over 366 days
 * (`ATTENDANCE_DATE_RANGE_TOO_LARGE`), so an over-long term is treated as "no
 * usable term" rather than sent and rejected.
 */
const MAX_RANGE_DAYS = 366;

/** The active year's term containing `todayIso`, or `null`. */
export function termRangeFor(
  years: readonly YearWindow[],
  todayIso: string,
): AttendanceDateRange | null {
  for (const year of years) {
    if (!year.isActive) continue;
    for (const term of year.terms) {
      if (!ISO_DAY.test(term.startDate) || !ISO_DAY.test(term.endDate))
        continue;
      // ISO days compare lexicographically; both ends inclusive.
      if (todayIso < term.startDate || todayIso > term.endDate) continue;
      if (daysInclusive(term.startDate, term.endDate) > MAX_RANGE_DAYS)
        continue;
      return { startDate: term.startDate, endDate: term.endDate };
    }
  }
  return null;
}

/**
 * Six months up to today — the no-server default. Well inside the 366-day cap
 * and long enough to contain a whole term on either side of a term boundary.
 */
export function fallbackRange(todayIso: string): AttendanceDateRange {
  const [year, month, day] = todayIso.split("-").map(Number);
  // Day 0 of the month AFTER the target month = its last day, so a 31st that
  // does not exist six months earlier clamps instead of rolling into the next
  // month (31 Aug → 28 Feb, not 2/3 Mar).
  const lastDayOfTarget = new Date(Date.UTC(year, month - 6, 0)).getUTCDate();
  const start = new Date(
    Date.UTC(year, month - 7, Math.min(day, lastDayOfTarget)),
  );
  return { startDate: start.toISOString().slice(0, 10), endDate: todayIso };
}

function daysInclusive(from: string, to: string): number {
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  return Math.round((toMs - fromMs) / 86_400_000) + 1;
}
