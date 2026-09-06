import type { ProgressBarColor } from "@/components/shared/progress-bar";
import type { StatTone } from "@/components/shared/stat-card/stat-card";

/**
 * Pure derivations for {@link AttendanceSummaryBlock} (US-E24.6), extracted so
 * the repo's node-env Vitest can prove the thresholds without a DOM.
 */

/** Design-spec `student-attendance`: ≥95 success · ≥90 warning · below error. */
export function rateTone(rate: number | null): StatTone {
  // `null` = no recorded day at all. A red "0%" would accuse a student of
  // missing school when the truth is that nothing has been recorded yet.
  if (rate === null) return "muted";
  if (rate >= 95) return "success";
  if (rate >= 90) return "warning";
  return "error";
}

/** The same thresholds on the monthly ProgressBar's fill. */
export function rateProgressColor(rate: number | null): ProgressBarColor {
  if (rate === null) return "primary";
  if (rate >= 95) return "success";
  if (rate >= 90) return "warning";
  return "error";
}

/**
 * `YYYY-MM` → a `Date` at noon UTC on the 1st, or `null` when the value is not
 * a month.
 *
 * Noon UTC keeps the calendar month identical in every real-world timezone, and
 * the caller formats it through `useFormatter().dateTime(..., timeZone:"UTC")`
 * so a `vi` reader gets "tháng 3 2026" and an `en` reader "March 2026" — the
 * mockup's hard-coded `Tháng 1..4` strings are not translatable.
 */
export function monthToDate(month: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return new Date(Date.UTC(year, monthIndex, 1, 12));
}
