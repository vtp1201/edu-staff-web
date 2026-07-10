/**
 * Typed failure union for the read-only timetable view.
 * - `not-found`     — class has no published timetable (drives the empty state).
 * - `no-child`      — parent selected a childId not in their roster.
 * - `network-error` — transport/BE failure (drives the error banner + retry).
 */
export type TimetableViewFailure =
  | { type: "not-found" }
  | { type: "no-child" }
  | { type: "network-error" };
