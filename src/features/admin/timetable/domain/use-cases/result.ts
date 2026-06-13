import type { TimetableFailure } from "../failures/timetable.failure";

/** Discriminated result for timetable use-cases. */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; failure: TimetableFailure };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T>(failure: TimetableFailure): Result<T> {
  return { ok: false, failure };
}
