import { enumerateDates } from "../../../domain/date-range";
import type { AttendanceDateRange } from "../../../domain/entities/attendance-date-range.entity";
import type {
  ChildAttendanceDayRecordDto,
  ChildAttendanceResponseDto,
} from "../../dtos/child-attendance-response.dto";

/**
 * Deterministic mock attendance generator (US-E20.5, mock-first per decision
 * `0014`). Generated rather than hand-listed on purpose: the screen's default
 * range is the CURRENT month, so a fixture pinned to one hard-coded month
 * would render empty forever from the next month on.
 *
 * Not i18n — this is seed data, not UI copy.
 */

const DAY_MS = 86_400_000;

/** Days since the UNIX epoch (which was a Thursday, `getUTCDay() === 4`). */
function epochDay(isoDate: string): number {
  return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / DAY_MS);
}

export function isWeekend(isoDate: string): boolean {
  const dow = (4 + (epochDay(isoDate) % 7) + 7) % 7;
  return dow === 0 || dow === 6;
}

/** Count of weekdays strictly before `isoDate` — a gap-free school-day index. */
function weekdayIndex(isoDate: string): number {
  const days = epochDay(isoDate);
  const fullWeeks = Math.floor(days / 7);
  const rem = days - fullWeeks * 7;
  let extra = 0;
  for (let i = 0; i < rem; i++) {
    const dow = (4 + i) % 7;
    if (dow !== 0 && dow !== 6) extra++;
  }
  return fullWeeks * 5 + extra;
}

/**
 * A 10-school-day cycle containing every status at least once, so any range of
 * ≥10 school days (i.e. any calendar month) exercises all four badges.
 *
 * UPPER_SNAKE because this builds a WIRE dto (US-E18.34): the mock deliberately
 * goes through the same DTO → mapper path as the real repository, so it must
 * speak the wire vocabulary or it would silently stop exercising the mapper.
 */
const STATUS_CYCLE = [
  "PRESENT",
  "PRESENT",
  "LATE",
  "PRESENT",
  "PRESENT",
  "EXCUSED_ABSENT",
  "PRESENT",
  "PRESENT",
  "ABSENT",
  "PRESENT",
] as const;

/** Stable per-child offset so two children never show identical histories. */
function childOffset(childId: string): number {
  let sum = 0;
  for (const ch of childId) sum += ch.charCodeAt(0);
  return sum % STATUS_CYCLE.length;
}

const MOCK_CLASS_ID = "cls-mock-1";

export function buildMockAttendanceDto(
  childId: string,
  range: AttendanceDateRange,
): ChildAttendanceResponseDto {
  const offset = childOffset(childId);
  const records: ChildAttendanceDayRecordDto[] = enumerateDates(
    range.startDate,
    range.endDate,
  )
    .filter((date) => !isWeekend(date))
    .map((date) => ({
      date,
      classId: MOCK_CLASS_ID,
      status: STATUS_CYCLE[(weekdayIndex(date) + offset) % STATUS_CYCLE.length],
    }));

  return { memberId: childId, records };
}
