/**
 * Typed failure union shared by both sub-resources (period-log + period-prep).
 * The `type` strings ARE the i18n key set under
 * `teacherClasses.hub.timetable.errors.*` — presentation translates, the domain
 * and repository never do.
 *
 * `slot-forbidden-or-missing` deliberately fuses "no slot", "not your slot",
 * "MANAGER is read-only", "weekend date" and "date outside the term" into ONE
 * state: core returns the SAME 422 for all of them so the write path cannot be
 * used as an occupancy oracle over a class's timetable (VULN-233-001 /
 * VULN-232-001). The client must NOT re-split what the BE fused, and must never
 * distinguish a 403 from a 422 here.
 *
 * `term-mismatch` (409 `PERIOD_LOG_TERM_MISMATCH`) exists on the period-LOG
 * write only — the prep contract lists no 409 at all, so the repository must
 * not manufacture one.
 */
export type PeriodLogFailure =
  | { type: "slot-forbidden-or-missing" }
  | { type: "term-mismatch" }
  | { type: "too-many-materials" }
  | { type: "lesson-plan-not-owned" }
  | { type: "validation" }
  | { type: "not-found" }
  | { type: "network-error" }
  | { type: "unknown" };

/**
 * The failure `type` strings as VALUES. They double as the i18n key set under
 * `teacherClasses.hub.timetable.errors.*`, so anything that produces an
 * `errorKey` must be checked against this list — a key outside it would reach
 * `t()` and blow up at render time. Kept next to the union so the two cannot
 * drift (a missing entry fails the `satisfies` below at compile time).
 */
export const PERIOD_LOG_FAILURE_TYPES = [
  "slot-forbidden-or-missing",
  "term-mismatch",
  "too-many-materials",
  "lesson-plan-not-owned",
  "validation",
  "not-found",
  "network-error",
  "unknown",
] as const satisfies readonly PeriodLogFailure["type"][];

/** Runtime membership test for an unknown value. */
export function isPeriodLogFailureType(
  value: unknown,
): value is PeriodLogFailure["type"] {
  return (
    typeof value === "string" &&
    (PERIOD_LOG_FAILURE_TYPES as readonly string[]).includes(value)
  );
}
