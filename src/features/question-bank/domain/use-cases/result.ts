import type { QuestionBankFailure } from "../failures/question-bank.failure";

/**
 * Discriminated result returned by every question-bank use-case: `{ ok, value }`
 * on success, `{ ok, failure }` on a typed domain failure. Use-cases never
 * throw — the throwing-repo boundary is caught inside each use-case and mapped
 * to a `QuestionBankFailure` via `mapRepoError`.
 *
 * Shape copied (not imported) from lesson-plan — domain layers have zero
 * cross-feature deps.
 */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; failure: QuestionBankFailure };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never>(failure: QuestionBankFailure): Result<T> => ({
  ok: false,
  failure,
});
