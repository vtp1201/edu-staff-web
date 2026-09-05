import type { TimetableSlot } from "@/features/timetable/domain/entities/timetable-slot.entity";
import { isoDateOf } from "./iso-week";

/**
 * Pure view-logic for the class-hub timetable tab (US-E24.9). Cross-feature
 * composition of `timetable` slots with `period-log` rows belongs HERE (the
 * consuming feature's own domain, decision 0017), never inside either feature.
 * Every function takes `now` as an argument — no ambient clock, so each
 * boundary case is a plain unit test.
 */

/** `${date}#${periodNumber}` — the ONE lookup key shared by the logs map, the
 *  preps map and the "đã ghi / đã chuẩn bị" chips. Never re-spelled inline. */
export function periodKeyOf(date: string, periodNumber: number): string {
  return `${date}#${periodNumber}`;
}

/**
 * Is this the signed-in teacher's own slot? Keyed on `teacherMemberId`
 * (decision 0074's tenant-scoped claim), never on a display name and never on
 * `sub`. An empty/absent id on either side is always `false` — an unreadable
 * token must not light up write affordances.
 */
export function isMySlot(
  slot: Pick<TimetableSlot, "teacherMemberId">,
  myMemberId: string,
): boolean {
  return (
    !!slot.teacherMemberId &&
    myMemberId.length > 0 &&
    slot.teacherMemberId === myMemberId
  );
}

/** `"HH:mm"` on `day` → epoch ms, or `null` when unparseable/absent. */
function atTime(day: Date, time: string | undefined): number | null {
  if (!time) return null;
  const [h, m] = time.split(":");
  const hours = Number(h);
  const minutes = Number(m);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hours,
    minutes,
  ).getTime();
}

/**
 * Is the period happening right now? ALWAYS false when either bell time is
 * missing. The bell schedule DOES have a wire source (BE US-244 —
 * `SlotResponse.startTime`/`endTime`, resolved server-side), but core OMITS
 * both when the tenant published no entry for the period, and the AC is
 * explicit that such a period shows neither a clock nor an "Đang diễn ra"
 * badge rather than a guessed one.
 */
export function isPeriodLive(
  slot: Pick<TimetableSlot, "startTime" | "endTime">,
  day: Date,
  now: Date,
): boolean {
  const start = atTime(day, slot.startTime);
  const end = atTime(day, slot.endTime);
  if (start === null || end === null) return false;
  const t = now.getTime();
  return t >= start && t <= end;
}

export interface UpcomingPeriod {
  dayIndex: number;
  /** YYYY-MM-DD */
  date: string;
  periodNumber: number;
  slot: TimetableSlot;
  isLive: boolean;
  /** `"HH:mm–HH:mm"`, or undefined when the bell schedule is unknown. */
  timeRange?: string;
}

/**
 * "Tiết sắp tới của tôi" — my nearest slot in the RENDERED week that is either
 * live now or still ahead, scanning (day, period) ascending.
 *
 * Scope is deliberately ONE week: the selector only sees the slots it was
 * given, so viewing the last period of a week after it ended yields `null`
 * ("Không có tiết sắp tới"). The AC's "qua cuối tuần → tiết đầu tuần sau" is
 * satisfied by navigating to `week+1`, which re-runs this against next week's
 * own slots — cheaper than a cross-week fetch and keeps this function pure.
 *
 * A period with NO bell time cannot be proven to have passed, so it counts as
 * upcoming for the remainder of its own day and is skipped once the day itself
 * is in the past.
 */
export function pickUpcomingPeriod(
  slots: Record<number, Record<number, TimetableSlot | null>>,
  myMemberId: string,
  weekDays: Date[],
  now: Date,
): UpcomingPeriod | null {
  const today = isoDateOf(now);

  for (let dayIndex = 0; dayIndex < weekDays.length; dayIndex++) {
    const day = weekDays[dayIndex];
    const date = isoDateOf(day);
    if (date < today) continue;

    const periods = slots[dayIndex] ?? {};
    const numbers = Object.keys(periods)
      .map(Number)
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);

    for (const periodNumber of numbers) {
      const slot = periods[periodNumber];
      if (!slot || !isMySlot(slot, myMemberId)) continue;

      const live = isPeriodLive(slot, day, now);
      const end = atTime(day, slot.endTime);
      // Already finished today → keep scanning. Unknown end time → treat as
      // upcoming (we cannot prove otherwise) for today only.
      if (!live && date === today && end !== null && end < now.getTime()) {
        continue;
      }

      return {
        dayIndex,
        date,
        periodNumber,
        slot,
        isLive: live,
        timeRange:
          slot.startTime && slot.endTime
            ? `${slot.startTime}–${slot.endTime}`
            : undefined,
      };
    }
  }
  return null;
}
