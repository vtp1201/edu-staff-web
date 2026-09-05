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
