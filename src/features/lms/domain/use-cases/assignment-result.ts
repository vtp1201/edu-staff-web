import type { AssignmentFailure } from "../failures/assignment.failure";

/** Discriminated result returned by assignment use-cases with a failure branch.
 *  Separate from `result.ts` (bound to `LmsFailure`) — different failure union. */
export type AssignmentResult<T> =
  | { ok: true; data: T }
  | { ok: false; failure: AssignmentFailure };

export function asgOk<T>(data: T): AssignmentResult<T> {
  return { ok: true, data };
}

export function asgFail<T = never>(
  failure: AssignmentFailure,
): AssignmentResult<T> {
  return { ok: false, failure };
}
