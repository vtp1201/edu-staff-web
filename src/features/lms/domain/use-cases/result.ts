import { LMS_FAILURE_TYPES, type LmsFailure } from "../failures/lms.failure";

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

/**
 * True ONLY for a value the repository threw as a real `LmsFailure`.
 *
 * Membership in `LMS_FAILURE_TYPES` is the whole point: a loose
 * `typeof type === "string"` check would hand a stray thrown object's `type`
 * to the client as an `errorKey`, which presentation renders through
 * `t("errors." + key)` — i.e. a raw untranslated key on screen.
 */
function isLmsFailure(err: unknown): err is LmsFailure {
  if (typeof err !== "object" || err === null) return false;
  const type = (err as { type?: unknown }).type;
  return (
    typeof type === "string" &&
    (LMS_FAILURE_TYPES as readonly string[]).includes(type)
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
