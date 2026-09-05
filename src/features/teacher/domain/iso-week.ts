/**
 * ISO week helpers for the class-hub timetable tab (US-E24.9). Pure and
 * deterministic: nothing calls `Date.now()` — the caller injects `now` — so
 * every week-boundary case is unit-testable (tdd.md determinism rule).
 *
 * The week param (`?week=YYYY-Www`) IS the state, matching the shell's own
 * "URL is the state" convention from US-E24.8. A malformed or hostile param
 * NEVER throws: it silently resolves to the current week, because a bad query
 * string must not 500 a teacher's class page.
 */

const ISO_WEEK_PARAM = /^(\d{4})-W(\d{2})$/;
const DAY_MS = 86_400_000;

/** Local `YYYY-MM-DD` (never `toISOString()`, which shifts by the UTC offset). */
export function isoDateOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Midnight-local Monday of the week containing `date`. */
export function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // getDay(): Sun = 0 … Sat = 6 → shift so Monday is the week's first day.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** Monday of ISO week 1 of `isoYear` (the week containing Jan 4th). */
function isoWeek1Monday(isoYear: number): Date {
  return mondayOf(new Date(isoYear, 0, 4));
}

/**
 * `"YYYY-Www"` → that week's Monday. Falls back to the Monday of `now`'s own
 * week for anything absent, malformed, or out of the 1..53 range.
 */
export function parseIsoWeek(param: string | undefined, now: Date): Date {
  const match = param?.match(ISO_WEEK_PARAM);
  if (!match) return mondayOf(now);

  const isoYear = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return mondayOf(now);

  const monday = new Date(isoWeek1Monday(isoYear));
  monday.setDate(monday.getDate() + (week - 1) * 7);
  // Week 53 does not exist in every ISO year — a 53 asked of a 52-week year
  // lands in the NEXT year, which would silently mislabel the strip. Reject it.
  if (toIsoWeekParam(monday) !== param) return mondayOf(now);
  return monday;
}

/** Monday → `"YYYY-Www"`, using the ISO year that OWNS the week (not the
 *  calendar year of the Monday: 2025-12-29 belongs to 2026-W01). */
export function toIsoWeekParam(monday: Date): string {
  // The Thursday of an ISO week always falls in that week's ISO year.
  const thursday = new Date(monday);
  thursday.setDate(thursday.getDate() + 3);
  const isoYear = thursday.getFullYear();
  const week =
    Math.round(
      (mondayOf(thursday).getTime() - isoWeek1Monday(isoYear).getTime()) /
        (7 * DAY_MS),
    ) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/** Shift a Monday by whole weeks. Returns a NEW date (never mutates). */
export function addWeeks(monday: Date, delta: number): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + delta * 7);
  return d;
}

/**
 * Mon–Sat (6 days). Matches `WeeklyTimetable`'s existing `dayIndex 0-5`
 * convention — Sunday has no row anywhere in this app, and core never resolves
 * a Sunday slot at all.
 *
 * Saturday is KEPT deliberately even though core's `SlotResponse.day` enum is
 * MON–FRI: Vietnamese schools do run Saturday sessions, the homeroom daily log
 * (`/homeroom-entries`, keyed by DATE, not by a slot) can legitimately exist on
 * one, and an absent Saturday card would silently hide it. With no periods
 * resolvable, the card simply renders the explicit "Không có tiết" state — an
 * honest empty, not a missing day.
 */
export function buildWeekDays(monday: Date): Date[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}
