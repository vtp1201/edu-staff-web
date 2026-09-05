/**
 * Core service `period-logs` + `period-preps` endpoints (US-E24.9, BE US-232/
 * US-233, ADR core 0144/0145). Two sub-resources of ONE bounded context, both
 * addressed by the concrete occurrence `(classId, date, periodNumber)`.
 *
 * `from`/`to` (list) and `termId`/`academicYearId` (delete) travel as axios
 * `params`, never URL-templated — same convention as `CLASS_LOG_EP` and
 * `TIMETABLE_VIEW_EP`.
 */
export const PERIOD_LOG_EP = {
  /** Week/range list — unpaginated, span capped at 31 days by the BE. */
  logsRange: (classId: string) =>
    `/core/api/v1/classes/${encodeURIComponent(classId)}/period-logs`,
  /** One occurrence (PUT upsert / DELETE). */
  logs: (classId: string, date: string, periodNumber: number) =>
    `/core/api/v1/classes/${encodeURIComponent(classId)}/period-logs/${encodeURIComponent(date)}/${periodNumber}`,
  prepsRange: (classId: string) =>
    `/core/api/v1/classes/${encodeURIComponent(classId)}/period-preps`,
  preps: (classId: string, date: string, periodNumber: number) =>
    `/core/api/v1/classes/${encodeURIComponent(classId)}/period-preps/${encodeURIComponent(date)}/${periodNumber}`,
} as const;
