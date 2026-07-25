/**
 * Bare-calendar-date helpers (NFR-009, FR-002) — pure, clock-free.
 *
 * `today` is ALWAYS injected by the caller (RSC/DI derive it once per request and
 * seed it into the ViewModel), so nothing here depends on `Date.now()` and every
 * test is deterministic (`.claude/rules/tdd.md`).
 */

const BARE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True when `value` is a bare `YYYY-MM-DD` calendar date that actually exists.
 * A datetime (`2026-05-06T07:40:00Z`) is NOT a bare calendar date — the BE
 * contract stores a date, not an instant.
 */
export function isBareCalendarDate(value: string): boolean {
  if (!BARE_DATE_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1) return false;
  // Round-trip through UTC: a non-existent day (2026-02-30) normalises away.
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/**
 * True when `date` is strictly AFTER `today`. Today itself is allowed (FR-002:
 * "a date that is today or in the past").
 *
 * A malformed `date` is NOT reported as future — format is a separate failure
 * (`invalid-input`) from a future date (`invalid-date`), and conflating them
 * would surface the wrong message ("Không thể chọn ngày trong tương lai").
 */
export function isFutureDate(date: string, today: string): boolean {
  if (!isBareCalendarDate(date) || !isBareCalendarDate(today)) return false;
  return date > today; // ISO bare dates sort lexicographically.
}

/** `Date` → bare `YYYY-MM-DD` in UTC. The only place a clock is read. */
export function toBareCalendarDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}
