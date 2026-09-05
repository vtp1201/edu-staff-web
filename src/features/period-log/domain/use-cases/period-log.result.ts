import {
  isPeriodLogFailureType,
  type PeriodLogFailure,
} from "../failures/period-log.failure";

/** Discriminated result shared by every period-log/period-prep use-case.
 *  Same `{ ok, data } | { ok, error }` shape as `timetable-view.result.ts`, the
 *  convention this tab's sibling reads already follow. */
export type PeriodLogResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: PeriodLogFailure };

export const ok = <T>(data: T): PeriodLogResult<T> => ({ ok: true, data });
export const fail = <T = never>(
  error: PeriodLogFailure,
): PeriodLogResult<T> => ({ ok: false, error });

/**
 * Narrow a thrown repository value to a typed failure. The repository already
 * throws `PeriodLogFailure`s (mapped from the normalised `ApiError` by
 * UPPER_SNAKE code by its OWN `toPeriodLogFailure`, which this deliberately
 * does NOT share a name with — that one MAPS an `ApiError`, this one only
 * VALIDATES an already-thrown value).
 *
 * The `type` must be a member of the union: it becomes an `errorKey` that
 * presentation feeds straight to `t()`, so an arbitrary object that merely HAS
 * a string `type` (any thrown library error) would otherwise produce a missing
 * i18n key at render time. Unknown shapes fall back to `unknown`; a genuinely
 * absent/non-object throw stays `network-error` (transport fault).
 */
export function narrowPeriodLogFailure(err: unknown): PeriodLogFailure {
  if (typeof err === "object" && err !== null && "type" in err) {
    const { type } = err as { type: unknown };
    return isPeriodLogFailureType(type) ? { type } : { type: "unknown" };
  }
  return { type: "network-error" };
}
