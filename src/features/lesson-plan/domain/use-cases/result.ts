import type { LessonPlanFailure } from "../failures/lesson-plan.failure";

/**
 * Discriminated result returned by every lesson-plan use-case: `{ ok, value }`
 * on success, `{ ok, failure }` on a typed domain failure. Use-cases never
 * throw — the throwing-repo boundary is caught inside each use-case and mapped
 * to a `LessonPlanFailure` via `mapRepoError`.
 */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; failure: LessonPlanFailure };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never>(failure: LessonPlanFailure): Result<T> => ({
  ok: false,
  failure,
});
