/**
 * Core service `homeroom-entries` endpoints (US-E13.3).
 * Base: /core/api/v1/classes/:classId/homeroom-entries
 */
export const CLASS_LOG_EP = {
  entries: (classId: string) =>
    `/core/api/v1/classes/${classId}/homeroom-entries`,
  submit: (classId: string, entryId: string) =>
    `/core/api/v1/classes/${classId}/homeroom-entries/${entryId}/submit`,
  approve: (classId: string, entryId: string) =>
    `/core/api/v1/classes/${classId}/homeroom-entries/${entryId}/approve`,
  reject: (classId: string, entryId: string) =>
    `/core/api/v1/classes/${classId}/homeroom-entries/${entryId}/reject`,
} as const;
