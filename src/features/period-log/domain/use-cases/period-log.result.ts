import type { PeriodLogFailure } from "../failures/period-log.failure";

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
 * UPPER_SNAKE code), so anything else is a genuine transport/runtime fault.
 */
export function toPeriodLogFailure(err: unknown): PeriodLogFailure {
  if (typeof err === "object" && err !== null && "type" in err) {
    return err as PeriodLogFailure;
  }
  return { type: "network-error" };
}
