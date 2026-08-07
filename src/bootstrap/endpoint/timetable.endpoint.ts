/**
 * core service — class timetable builder endpoints (real contract, US-E18.11).
 * Routed through Kong gateway (ADR 0030 / US-E06.3): `/core/api/v1/...` → Kong
 * strips `/core` → core receives `/api/v1/...`.
 *
 * The timetable is class-scoped and term-scoped (a mandatory `termId` query/body
 * param). There is NO per-slot PUT (only full-replace on the base path) — see
 * the repository for the read-modify-write write path.
 *
 * The conflicts scan (BE US-188, US-E18.48) is the one endpoint here that is NOT
 * class-scoped: it is a whole-TENANT read keyed by `termId` alone, with the
 * tenant taken from the verified token claim. Note the flat path — it is NOT
 * nested under `/classes/{classId}`.
 */
export const TIMETABLE_EP = {
  /** GET (read, `?termId=`) + PUT (full-replace) a class timetable. */
  timetable: (classId: string) =>
    `/core/api/v1/classes/${encodeURIComponent(classId)}/timetable`,
  /** DELETE one slot (`?termId=&day=&period=`). */
  slots: (classId: string) =>
    `/core/api/v1/classes/${encodeURIComponent(classId)}/timetable/slots`,
  /** GET the whole-school double-booking scan (`?termId=`) — ADMIN/SUPER_ADMIN
   *  only; MANAGER is deliberately NOT authorized (BE US-188). */
  conflicts: "/core/api/v1/timetable/conflicts",
} as const;
