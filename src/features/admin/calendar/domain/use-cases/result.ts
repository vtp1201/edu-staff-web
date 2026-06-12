import type { CalendarFailure } from "../failures/calendar.failure";

/** Discriminated result for calendar use-cases. */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; failure: CalendarFailure };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T>(failure: CalendarFailure): Result<T> {
  return { ok: false, failure };
}
