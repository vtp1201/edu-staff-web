import type { LmsFailure } from "../failures/lms.failure";

/** Discriminated result returned by LMS use-cases with a failure branch. */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; failure: LmsFailure };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail<T = never>(failure: LmsFailure): Result<T> {
  return { ok: false, failure };
}
