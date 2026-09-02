import type { LmsFailure } from "../failures/lms.failure";

/** Discriminated result returned by every LMS use-case. */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; failure: LmsFailure };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail<T = never>(failure: LmsFailure): Result<T> {
  return { ok: false, failure };
}

/** True for a value the repository threw as an `LmsFailure`. */
function isLmsFailure(err: unknown): err is LmsFailure {
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as { type?: unknown }).type === "string"
  );
}

/**
 * The single catch boundary shared by every use-case: repositories throw an
 * `LmsFailure` (see `i-lms.repository.ts`), and anything else — a genuine
 * programming error, a thrown `Error` from a mock — degrades to `unknown`
 * rather than escaping into a Server Action as an unhandled rejection.
 */
export async function runCatching<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (err) {
    return fail(isLmsFailure(err) ? err : { type: "unknown" });
  }
}
