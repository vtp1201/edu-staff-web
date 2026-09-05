import { describe, expect, it } from "vitest";
import type { TimetableSlot } from "@/features/timetable/domain/entities/timetable-slot.entity";
import { buildWeekDays, parseIsoWeek } from "./iso-week";
import {
  isMySlot,
  isPeriodLive,
  periodKeyOf,
  pickUpcomingPeriod,
} from "./timetable-tab-selectors";

const NOW = new Date(2026, 8, 2, 10, 30); // Wed 2026-09-02 10:30
const WEEK_DAYS = buildWeekDays(parseIsoWeek("2026-W36", NOW)); // Mon 08-31 … Sat 09-05
const ME = "member-me";

function slot(over: Partial<TimetableSlot> = {}): TimetableSlot {
  return {
    subjectId: "math",
    subjectName: "Toán",
    subjectColorToken: "primary",
    teacherMemberId: ME,
    ...over,
  };
}

/** `slots[dayIndex][periodNumber]` grid builder. */
function grid(
  entries: [number, number, TimetableSlot][],
): Record<number, Record<number, TimetableSlot | null>> {
  const out: Record<number, Record<number, TimetableSlot | null>> = {};
  for (const [day, period, s] of entries) {
    out[day] ??= {};
    out[day][period] = s;
  }
  return out;
}

describe("periodKeyOf", () => {
  it("is the ONE spelling of the (date, period) lookup key", () => {
    expect(periodKeyOf("2026-09-02", 3)).toBe("2026-09-02#3");
  });
});

describe("isMySlot", () => {
  it("matches on teacherMemberId", () => {
    expect(isMySlot(slot(), ME)).toBe(true);
  });

  it("does NOT match when the caller passed a `sub`-shaped id that differs from memberId", () => {
    // decision 0074: the highlight must key on the tenant-scoped memberId claim.
    // A caller that read `sub` instead gets a different id → no highlight, which
    // is exactly the fail-closed behaviour the AC asks for.
    expect(isMySlot(slot({ teacherMemberId: "member-abc" }), "sub-abc")).toBe(
      false,
    );
  });

  it("never matches an empty/absent id (unreadable token, or a slot with no teacher)", () => {
    expect(isMySlot(slot(), "")).toBe(false);
    expect(isMySlot(slot({ teacherMemberId: undefined }), "")).toBe(false);
    expect(isMySlot(slot({ teacherMemberId: undefined }), ME)).toBe(false);
  });
});

describe("isPeriodLive", () => {
  const day = WEEK_DAYS[2]; // Wed 2026-09-02

  it("is true when now falls inside [start, end] on that day", () => {
    expect(
      isPeriodLive({ startTime: "10:00", endTime: "10:45" }, day, NOW),
    ).toBe(true);
  });

  it("is false before and after the window", () => {
    expect(
      isPeriodLive({ startTime: "11:00", endTime: "11:45" }, day, NOW),
    ).toBe(false);
    expect(
      isPeriodLive({ startTime: "09:00", endTime: "09:45" }, day, NOW),
    ).toBe(false);
  });

  it("is false on a DIFFERENT day even inside the same clock window", () => {
    expect(
      isPeriodLive({ startTime: "10:00", endTime: "10:45" }, WEEK_DAYS[0], NOW),
    ).toBe(false);
  });

  it("is false whenever either bell time is missing (no schedule shipped yet)", () => {
    expect(isPeriodLive({}, day, NOW)).toBe(false);
    expect(isPeriodLive({ startTime: "10:00" }, day, NOW)).toBe(false);
    expect(isPeriodLive({ endTime: "10:45" }, day, NOW)).toBe(false);
  });

  it("is false for an unparseable time rather than throwing", () => {
    expect(isPeriodLive({ startTime: "??", endTime: "10:45" }, day, NOW)).toBe(
      false,
    );
  });
});

describe("pickUpcomingPeriod", () => {
  it("picks the currently LIVE period of mine over a later one", () => {
    const slots = grid([
      [2, 3, slot({ startTime: "10:00", endTime: "10:45" })],
      [2, 5, slot({ startTime: "13:00", endTime: "13:45" })],
    ]);

    const picked = pickUpcomingPeriod(slots, ME, WEEK_DAYS, NOW);

    expect(picked?.periodNumber).toBe(3);
    expect(picked?.date).toBe("2026-09-02");
    expect(picked?.isLive).toBe(true);
  });

  it("picks the next FUTURE period of mine later the same day", () => {
    const slots = grid([
      [2, 1, slot({ startTime: "07:00", endTime: "07:45" })], // already past
      [2, 6, slot({ startTime: "13:00", endTime: "13:45" })],
    ]);

    const picked = pickUpcomingPeriod(slots, ME, WEEK_DAYS, NOW);

    expect(picked?.periodNumber).toBe(6);
    expect(picked?.isLive).toBe(false);
  });

  it("rolls over to a later DAY when today has nothing left", () => {
    const slots = grid([
      [2, 1, slot({ startTime: "07:00", endTime: "07:45" })],
      [4, 2, slot({ startTime: "07:50", endTime: "08:35" })], // Friday
    ]);

    const picked = pickUpcomingPeriod(slots, ME, WEEK_DAYS, NOW);

    expect(picked?.date).toBe("2026-09-04");
    expect(picked?.periodNumber).toBe(2);
  });

  it("returns null past the LAST period of the rendered week (AC's weekend case)", () => {
    // now = Saturday evening, the only slot was Saturday morning: nothing left
    // in THIS week. The panel shows "Không có tiết sắp tới"; navigating to
    // week+1 re-runs this selector against next week's own slots.
    const saturdayEvening = new Date(2026, 8, 5, 20, 0);
    const slots = grid([
      [5, 1, slot({ startTime: "07:00", endTime: "07:45" })],
    ]);

    expect(
      pickUpcomingPeriod(slots, ME, WEEK_DAYS, saturdayEvening),
    ).toBeNull();
  });

  it("returns null when the week has no slots at all", () => {
    expect(pickUpcomingPeriod({}, ME, WEEK_DAYS, NOW)).toBeNull();
  });

  it("never picks ANOTHER teacher's period (forged/mismatched memberId)", () => {
    const slots = grid([
      [2, 6, slot({ teacherMemberId: "member-other" })],
      [3, 1, slot({ teacherMemberId: "member-other" })],
    ]);

    expect(pickUpcomingPeriod(slots, ME, WEEK_DAYS, NOW)).toBeNull();
    expect(pickUpcomingPeriod(slots, "", WEEK_DAYS, NOW)).toBeNull();
  });

  it("treats a period with NO bell time as future for the rest of today (can't prove it passed)", () => {
    const slots = grid([[2, 4, slot()]]);

    const picked = pickUpcomingPeriod(slots, ME, WEEK_DAYS, NOW);

    expect(picked?.periodNumber).toBe(4);
    expect(picked?.isLive).toBe(false);
    expect(picked?.timeRange).toBeUndefined();
  });

  it("skips a day that lies entirely in the past even without bell times", () => {
    const slots = grid([[0, 4, slot()]]); // Monday, now is Wednesday

    expect(pickUpcomingPeriod(slots, ME, WEEK_DAYS, NOW)).toBeNull();
  });
});
