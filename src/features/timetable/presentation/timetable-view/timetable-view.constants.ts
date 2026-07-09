/**
 * Static grid axes. Period start/end times are DATA (school bell schedule), not
 * UI copy — kept as constants, not i18n. Day + period + recess LABELS are i18n
 * (see the `timetableView` namespace); these constants only carry the numeric
 * period + times. dayIndex 0..5 = Mon..Sat, matching the entity's slot keys.
 */

/** i18n label keys for day columns (dayIndex 0..5). */
export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat"] as const;

export interface PeriodRow {
  n: number;
  start: string;
  end: string;
}

export const PERIODS: readonly PeriodRow[] = [
  { n: 1, start: "07:00", end: "07:45" },
  { n: 2, start: "07:50", end: "08:35" },
  { n: 3, start: "08:45", end: "09:30" },
  { n: 4, start: "09:35", end: "10:20" },
  { n: 5, start: "10:25", end: "11:10" },
  { n: 6, start: "13:30", end: "14:15" },
  { n: 7, start: "14:20", end: "15:05" },
  { n: 8, start: "15:15", end: "16:00" },
  { n: 9, start: "16:05", end: "16:50" },
  { n: 10, start: "16:55", end: "17:40" },
] as const;

/** The lunch recess sits between period 5 and period 6. */
export const RECESS_AFTER_PERIOD = 5;
