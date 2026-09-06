import type { ChildAttendanceRecord } from "@/features/parent-attendance/domain/entities/child-attendance-record.entity";
import type {
  AttendanceRollup,
  AttendanceSummary,
  MonthlyRollup,
} from "./entities/attendance-summary.entity";

/**
 * Roll per-day attendance records up into the totals + monthly breakdown the
 * attendance portal renders (US-E24.6). Pure: same input, same output, no
 * clock, no locale, no framework.
 *
 * DELIBERATE OMISSION — no `now` parameter. The plan sketched
 * `summarizeAttendance(records, now)`, but nothing in the AC depends on the
 * current date: months come from the records themselves and a month with no
 * records is omitted rather than zero-filled, so there is no "pad up to today"
 * behaviour a clock could drive. An unused, injectable-looking parameter would
 * imply a time dependence that does not exist (and would have to be threaded
 * through every caller and story). If a future AC needs "show every month of
 * the term, including empty ones", that is a different function with the term
 * bounds as its input — not a hidden `new Date()`.
 *
 * `ChildAttendanceRecord` is a type-only cross-feature import: it is the single
 * per-day attendance shape both the parent read and (US-E24.6) the student read
 * produce, and re-declaring it here would fork the vocabulary. Same precedent
 * as `parent-attendance` importing `AttendanceStatus` from this feature.
 */
export function summarizeAttendance(
  records: readonly ChildAttendanceRecord[],
): AttendanceRollup {
  const byMonth = new Map<string, ChildAttendanceRecord[]>();

  for (const record of records) {
    const month = monthOf(record.date);
    // A record whose date is not a calendar day cannot be filed under a month.
    // It is NOT discarded from the totals — the BE sent it, so it is a real
    // recorded day; silently dropping it would understate the denominator.
    if (month === null) continue;
    const bucket = byMonth.get(month);
    if (bucket) bucket.push(record);
    else byMonth.set(month, [record]);
  }

  const months: MonthlyRollup[] = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, monthRecords]) => {
      const counts = countStatuses(monthRecords);
      return {
        month,
        total: counts.total,
        presentCount: counts.presentCount,
        excusedCount: counts.excusedCount,
        unexcusedCount: counts.unexcusedCount,
        rate: rateOf(counts.presentCount, counts.total),
      };
    });

  const totals = countStatuses(records);
  const summary: AttendanceSummary = {
    ...totals,
    rate: rateOf(totals.presentCount, totals.total),
  };

  return { summary, months };
}

function countStatuses(
  records: readonly ChildAttendanceRecord[],
): Omit<AttendanceSummary, "rate"> {
  const counts = {
    total: records.length,
    presentCount: 0,
    lateCount: 0,
    excusedCount: 0,
    unexcusedCount: 0,
  };
  for (const record of records) {
    switch (record.status) {
      case "present":
        counts.presentCount += 1;
        break;
      case "late":
        counts.lateCount += 1;
        break;
      case "excusedAbsent":
        counts.excusedCount += 1;
        break;
      case "absent":
        counts.unexcusedCount += 1;
        break;
    }
  }
  return counts;
}

/** Percentage 0–100 to one decimal; `null` over an empty denominator. */
function rateOf(present: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((present / total) * 1000) / 10;
}

/** `YYYY-MM-DD` → `YYYY-MM`; `null` for anything else. */
function monthOf(isoDate: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate.slice(0, 7) : null;
}
