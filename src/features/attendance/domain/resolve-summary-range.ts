import { daysInclusive } from "./date-range";
import type { TermWindow, YearWindow } from "./entities/academic-window.entity";
import type { AttendanceFailure } from "./failures/attendance.failure";

/**
 * Which range the "Tổng hợp chuyên cần" tab reads (US-E24.14).
 *
 * Pure and clock-free: `todayIso` is always injected, never `Date.now()`, so
 * every boundary is testable. The academic calendar (`GET /academic-years`) is
 * an ADMIN-shaped read a TEACHER may be refused (packet Q1); the caller passes
 * `[]` in that case and the term/year kinds answer the {@link NoTerms}
 * sentinel, which the controls render as "only Tháng is available" — a visible
 * degrade, never a crash and never a silently wrong range.
 *
 * `TermWindow`/`YearWindow` come from the feature's own
 * `entities/academic-window.entity.ts` — the same structural shape
 * `resolve-student-range.ts` (US-E24.6) speaks, promoted to `domain/` rather
 * than re-declared, so there is one vocabulary and no domain→presentation
 * import. {@link SummaryTerm} only ADDS the identity the term dropdown
 * needs (`AcademicYear.terms` already carries `id`/`name`).
 */
export interface SummaryTerm extends TermWindow {
  id: string;
  name: string;
}

export interface SummaryYear extends YearWindow {
  terms: readonly SummaryTerm[];
}

export type SummaryRangeKind = "month" | "term" | "year";

export interface SummaryRange {
  startDate: string;
  endDate: string;
}

/**
 * "There is no academic calendar to derive this range from" — NOT a failure:
 * nothing went wrong, the term/year segments simply cannot be offered. Kept
 * distinct from `AttendanceFailure` so the UI shows a neutral notice instead of
 * an error card.
 */
export interface NoTerms {
  type: "no-terms";
}

/** Why a range could not be used. The two causes read DIFFERENTLY to the
 *  teacher — "shorten the span" is useless advice for a month that has not
 *  started — so the reason travels with the failure instead of being guessed
 *  at the UI boundary. `type` stays `invalid-request` so the value is still a
 *  plain {@link AttendanceFailure} for anything that only branches on `type`. */
export type InvalidRangeReason = "too-large" | "invalid-selection";

export interface InvalidSummaryRange
  extends Extract<AttendanceFailure, { type: "invalid-request" }> {
  reason: InvalidRangeReason;
}

export type SummaryRangeOutcome = SummaryRange | InvalidSummaryRange | NoTerms;

function invalid(reason: InvalidRangeReason): InvalidSummaryRange {
  return { type: "invalid-request", reason };
}

export interface SummarySelection {
  /** `YYYY-MM`, when the user picked a month other than the current one. */
  month?: string;
  /** A term id of the ACTIVE year; anything else is ignored. */
  termId?: string;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;

/** `GET /classes/{id}/attendance` refuses a range over 366 days
 *  (`ATTENDANCE_DATE_RANGE_TOO_LARGE`) — rejected here, before any wire call,
 *  the same reject-not-truncate posture `ListAttendanceHistoryUseCase` takes. */
export const MAX_SUMMARY_RANGE_DAYS = 366;

export function isSummaryRange(
  outcome: SummaryRangeOutcome,
): outcome is SummaryRange {
  return !("type" in outcome);
}

export function isNoTerms(outcome: SummaryRangeOutcome): outcome is NoTerms {
  return "type" in outcome && outcome.type === "no-terms";
}

export function isInvalidRange(
  outcome: SummaryRangeOutcome,
): outcome is InvalidSummaryRange {
  return "type" in outcome && outcome.type === "invalid-request";
}

/** The ACTIVE year's terms (the dropdown's options), in wire order. Terms with
 *  unusable dates are dropped rather than offered and then rejected. */
export function termsOf(years: readonly SummaryYear[]): SummaryTerm[] {
  const active = years.find((year) => year.isActive);
  if (!active) return [];
  return active.terms.filter(
    (term) => ISO_DAY.test(term.startDate) && ISO_DAY.test(term.endDate),
  );
}

export function resolveSummaryRange(
  kind: SummaryRangeKind,
  todayIso: string,
  years: readonly SummaryYear[],
  selection: SummarySelection = {},
): SummaryRangeOutcome {
  const range =
    kind === "month"
      ? monthRange(todayIso, selection.month)
      : kind === "term"
        ? termRange(todayIso, years, selection.termId)
        : yearRange(todayIso, years);

  if (!isSummaryRange(range)) return range;
  // An inverted range is a broken selection (a term whose dates run
  // backwards), NOT an oversize one — different cause, different copy.
  if (range.endDate < range.startDate) return invalid("invalid-selection");
  if (daysInclusive(range.startDate, range.endDate) > MAX_SUMMARY_RANGE_DAYS) {
    return invalid("too-large");
  }
  return range;
}

/** First → last calendar day of the selected (default: current) month, with
 *  the end clamped to today so the denominator never includes days that have
 *  not happened. */
function monthRange(todayIso: string, month?: string): SummaryRangeOutcome {
  const target = month ?? todayIso.slice(0, 7);
  if (!ISO_MONTH.test(target)) return invalid("invalid-selection");
  const [year, monthNumber] = target.split("-").map(Number) as [number, number];
  // Day 0 of the NEXT month is the last day of this one — no month-length table.
  const lastDay = new Date(Date.UTC(year, monthNumber, 0))
    .toISOString()
    .slice(0, 10);
  const startDate = `${target}-01`;
  if (startDate > todayIso) {
    // A month that has not begun: refuse rather than send an inverted range.
    return invalid("invalid-selection");
  }
  return { startDate, endDate: lastDay < todayIso ? lastDay : todayIso };
}

/**
 * The selected term of the active year; defaulting to the term containing
 * today, else the LAST term of that year (between terms / summer, so the tab
 * still shows the most recent complete term instead of nothing).
 *
 * The term is NOT clamped to today: an unfinished term simply has no records
 * for its future days, so the counts are identical, and showing the term's own
 * dates keeps the subtitle honest about what was asked for.
 */
function termRange(
  todayIso: string,
  years: readonly SummaryYear[],
  termId?: string,
): SummaryRangeOutcome {
  const terms = termsOf(years);
  if (terms.length === 0) return { type: "no-terms" };

  const selected =
    (termId ? terms.find((term) => term.id === termId) : undefined) ??
    terms.find(
      (term) => todayIso >= term.startDate && todayIso <= term.endDate,
    ) ??
    terms[terms.length - 1];
  // Non-null: `terms` is non-empty, so the last element exists.
  if (!selected) return { type: "no-terms" };
  return { startDate: selected.startDate, endDate: selected.endDate };
}

/**
 * The whole active year, clamped to today.
 *
 * `AcademicYear` carries NO year-level `startDate`/`endDate` (only `terms[]`),
 * so the bounds are derived: `min(terms.startDate)` → `min(max(terms.endDate),
 * today)`. If BE/admin-calendar ever adds year-level dates, prefer them here.
 */
function yearRange(
  todayIso: string,
  years: readonly SummaryYear[],
): SummaryRangeOutcome {
  const terms = termsOf(years);
  const first = terms[0];
  if (!first) return { type: "no-terms" };

  const startDate = terms.reduce(
    (min, term) => (term.startDate < min ? term.startDate : min),
    first.startDate,
  );
  const lastEnd = terms.reduce(
    (max, term) => (term.endDate > max ? term.endDate : max),
    first.endDate,
  );
  return { startDate, endDate: lastEnd < todayIso ? lastEnd : todayIso };
}
