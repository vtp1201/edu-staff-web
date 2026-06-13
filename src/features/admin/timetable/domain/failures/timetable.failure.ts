/**
 * Typed timetable failures. Use-cases/repository return a stable `type` key;
 * presentation maps it to a translated string via `timetable.errors.<type>`.
 */
export type TimetableFailure =
  | { type: "slot-not-found"; message: string }
  | { type: "fetch-failed"; message: string }
  | { type: "save-failed"; message: string };
