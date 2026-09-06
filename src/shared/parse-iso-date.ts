/**
 * `YYYY-MM-DD` → a `Date` at **noon UTC**, or `null` when the value is not a
 * calendar day (bad shape, or an out-of-range day that `Date.UTC` would roll
 * over silently).
 *
 * Deliberately does NOT format: callers render it through next-intl's
 * `useFormatter().dateTime(..., { timeZone: "UTC" })`, so a `vi` reader gets
 * `03/08/2026` and an `en` reader `08/03/2026` from the same value. Noon UTC
 * keeps the calendar day identical in every real-world timezone.
 *
 * Lives in `shared/` since US-E24.6: it started life inside
 * `parent-attendance`'s view-model helpers, and the shared
 * `AttendanceSummaryBlock` needed the same parse. A `components/shared/*`
 * component must not reach into a feature's presentation folder, so the helper
 * was PROMOTED (moved, not copied — `component-organization.md`); the old
 * module re-exports it so its existing import sites and tests are unchanged.
 */
export function parseIsoDate(isoDate: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const rolledOver =
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day;
  return rolledOver ? null : date;
}
