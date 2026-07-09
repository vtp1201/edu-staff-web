import type { TimetableViewFailure } from "../failures/timetable-view.failure";

/** Discriminated Result shared by the timetable-view use-cases. */
export type TimetableViewResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: TimetableViewFailure };

/** Narrow a thrown value to a typed failure, else `network-error`. */
export function toTimetableFailure(err: unknown): TimetableViewFailure {
  if (typeof err === "object" && err !== null && "type" in err) {
    return err as TimetableViewFailure;
  }
  return { type: "network-error" };
}
