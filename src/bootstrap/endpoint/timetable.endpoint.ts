/**
 * core service — class timetable builder endpoints (real contract, US-E18.11).
 * Routed through Kong gateway (ADR 0030 / US-E06.3): `/core/api/v1/...` → Kong
 * strips `/core` → core receives `/api/v1/...`.
 *
 * The timetable is class-scoped and term-scoped (a mandatory `termId` query/body
 * param). There is NO per-slot PUT (only full-replace on the base path) and NO
 * whole-school conflicts endpoint — see the repository for the read-modify-write
 * write path and the (mock-only) proactive conflict summary.
 */
export const TIMETABLE_EP = {
  /** GET (read, `?termId=`) + PUT (full-replace) a class timetable. */
  timetable: (classId: string) =>
    `/core/api/v1/classes/${encodeURIComponent(classId)}/timetable`,
  /** DELETE one slot (`?termId=&day=&period=`). */
  slots: (classId: string) =>
    `/core/api/v1/classes/${encodeURIComponent(classId)}/timetable/slots`,
} as const;
