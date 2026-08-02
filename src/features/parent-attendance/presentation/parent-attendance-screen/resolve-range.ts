import { currentMonthRange } from "../../domain/date-range";
import type { AttendanceDateRange } from "../../domain/entities/attendance-date-range.entity";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDay(value: string | undefined): value is string {
  if (!value || !ISO_DAY.test(value)) return false;
  return !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/**
 * URL search params → applied range. A malformed/absent bound falls back to the
 * current month's matching bound, so a hand-typed query string can never render
 * a broken page. An INVERTED but well-formed range is passed through on purpose
 * — the use-case turns it into the `invalid-date-range` failure the user needs
 * to see.
 */
export function resolveRangeFromParams(
  params: { startDate?: string; endDate?: string },
  todayIso: string,
): AttendanceDateRange {
  const fallback = currentMonthRange(todayIso);
  return {
    startDate: isIsoDay(params.startDate)
      ? params.startDate
      : fallback.startDate,
    endDate: isIsoDay(params.endDate) ? params.endDate : fallback.endDate,
  };
}

/**
 * The selected child must be one of the parent's OWN linked children — an
 * arbitrary `?childId=` from the URL is never forwarded to the repository.
 */
export function resolveActiveChildId(
  childIds: readonly string[],
  requested: string | undefined,
): string | null {
  if (requested && childIds.includes(requested)) return requested;
  return childIds[0] ?? null;
}
