/**
 * Day representation bridge (US-E18.11 BE wiring).
 *
 * The web domain models a slot's `day` as a 0-indexed number (0 = Mon … 5 = Sat,
 * matching the 6-column builder grid). The real `core` timetable contract uses a
 * string enum limited to the Mon–Fri school week (`MON|TUE|WED|THU|FRI`) — there
 * is no Saturday on the wire (`services/core/docs/openapi.yaml` `SlotRequest`).
 *
 * These pure converters are the single boundary between the two. Saturday
 * (index 5) has no wire representation: `dayIndexToEnum(5)` throws, and the repo
 * maps that to an `invalid-day` failure — a real BE limitation surfaced honestly
 * rather than silently dropping a Saturday slot.
 */
export const DAY_ENUM_BY_INDEX = ["MON", "TUE", "WED", "THU", "FRI"] as const;

export type DayEnum = (typeof DAY_ENUM_BY_INDEX)[number];

/** 0-indexed day (0 = Mon) → wire enum. Throws for days outside Mon–Fri. */
export function dayIndexToEnum(index: number): DayEnum {
  const value = DAY_ENUM_BY_INDEX[index];
  if (value === undefined) {
    throw new RangeError(
      `No BE day enum for day index ${index} (the core week is MON–FRI only)`,
    );
  }
  return value;
}

/** Wire enum → 0-indexed day. Throws for an unknown enum value. */
export function dayEnumToIndex(day: string): number {
  const index = (DAY_ENUM_BY_INDEX as readonly string[]).indexOf(day);
  if (index < 0) {
    throw new RangeError(`Unknown day enum: ${day}`);
  }
  return index;
}
