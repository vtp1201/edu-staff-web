/**
 * Typed calendar failures. Use-cases/repository return a stable `type` key;
 * presentation maps it to a translated string via `calendar.errors.<type>`.
 */
export type CalendarFailure =
  | { type: "date-order"; message: string }
  | { type: "date-overlap"; message: string }
  | { type: "graded-term-delete"; message: string }
  | { type: "not-found-year"; message: string }
  | { type: "not-found-term"; message: string }
  | { type: "year-label-exists"; message: string }
  | { type: "active-year-exists"; message: string }
  | { type: "year-archived"; message: string }
  | { type: "network-error"; message: string }
  | { type: "unknown"; message: string };
