export const GRADES_EP = {
  sheet: (csId: string) => `/core/api/v1/class-subjects/${csId}/grades`,
  saveScore: (csId: string, studentId: string) =>
    `/core/api/v1/class-subjects/${csId}/grades/${studentId}`,
  publish: (csId: string) =>
    `/core/api/v1/class-subjects/${csId}/grades/publish`,
  // US-E14.4 — grade approval pipeline (admin):
  batches: (status?: string) =>
    status
      ? `/core/api/v1/grade-batches?status=${status}`
      : `/core/api/v1/grade-batches`,
  batchDetail: (id: string) => `/core/api/v1/grade-batches/${id}`,
  approveBatch: (id: string) => `/core/api/v1/grade-batches/${id}/approve`,
  requestRevision: (id: string) =>
    `/core/api/v1/grade-batches/${id}/request-revision`,
  bulkLock: () => `/core/api/v1/grade-batches/bulk-lock`,
} as const;
