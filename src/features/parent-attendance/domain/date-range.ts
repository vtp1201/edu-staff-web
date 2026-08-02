/**
 * Pure UTC day-math for the parent attendance range, ISO `YYYY-MM-DD` only.
 *
 * Copied (6 lines) rather than imported from `features/attendance/domain/
 * date-range.ts` on purpose: `domain/` must not depend on anything outside its
 * own layer, and a domain→domain edge between two independent features is the
 * kind of coupling the layer table does not bless. At this size, duplication is
 * cheaper than the dependency (KISS over DRY).
 */

export function daysInclusive(from: string, to: string): number {
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  return Math.round((toMs - fromMs) / 86_400_000) + 1;
}

/** Every ISO day from `from` to `to`, inclusive, ascending. */
export function enumerateDates(from: string, to: string): string[] {
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  const dates: string[] = [];
  for (let t = fromMs; t <= toMs; t += 86_400_000) {
    dates.push(new Date(t).toISOString().slice(0, 10));
  }
  return dates;
}

/** First/last ISO day of the UTC month containing `isoDate` (default range). */
export function currentMonthRange(isoDate: string): {
  startDate: string;
  endDate: string;
} {
  const [year, month] = isoDate.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
