/**
 * Day representation bridge (US-E18.11 BE wiring) — mirrors
 * `features/admin/timetable/domain/day-enum.ts` 1:1. Kept as a separate copy
 * (not a shared import) because the two timetable feature modules are
 * intentionally decoupled at the infra/domain layer (plan decision 3) — each
 * owns its own contract-facing primitives.
 *
 * The web domain models a slot's `day` as a 0-indexed number (0 = Mon … 5 =
 * Sat). The real `core` timetable contract uses a string enum limited to the
 * Mon–Fri school week (`MON|TUE|WED|THU|FRI`) — no Saturday on the wire.
 */
export const DAY_ENUM_BY_INDEX = ["MON", "TUE", "WED", "THU", "FRI"] as const;

export type DayEnum = (typeof DAY_ENUM_BY_INDEX)[number];

/** Wire enum → 0-indexed day. Throws for an unknown enum value. */
export function dayEnumToIndex(day: string): number {
  const index = (DAY_ENUM_BY_INDEX as readonly string[]).indexOf(day);
  if (index < 0) {
    throw new RangeError(`Unknown day enum: ${day}`);
  }
  return index;
}
