/**
 * `core` service — grade entry / grade report endpoints (US-E18.12, ADR 0054).
 * Ground-truthed against `core/docs/openapi.yaml` (`GradeEntry`/`GradeReport`
 * tags, ~L2167-2609). Routed through Kong gateway: `/core/api/v1/...` → Kong
 * strips `/core` → core receives `/api/v1/...`.
 */
export const GRADES_EP = {
  /** `PUT` enter/update a grade (always persists DRAFT). */
  entry: (
    classId: string,
    subjectId: string,
    termId: string,
    studentId: string,
    columnId: string,
  ) =>
    `/core/api/v1/classes/${classId}/subjects/${subjectId}/terms/${termId}/grades/${studentId}/columns/${columnId}`,
  /** `POST` submit a DRAFT entry (TEACHER). */
  submitEntry: (
    classId: string,
    subjectId: string,
    termId: string,
    studentId: string,
    columnId: string,
  ) =>
    `/core/api/v1/classes/${classId}/subjects/${subjectId}/terms/${termId}/grades/${studentId}/columns/${columnId}/submit`,
  /** `POST` approve a PENDING_APPROVAL entry (ADMIN/MANAGER) — dormant real
   *  branch, no current UI caller (`grade-approval-screen` stays mock, ADR 0054). */
  approveEntry: (
    classId: string,
    subjectId: string,
    termId: string,
    studentId: string,
    columnId: string,
  ) =>
    `/core/api/v1/classes/${classId}/subjects/${subjectId}/terms/${termId}/grades/${studentId}/columns/${columnId}/approve`,
  /** `POST` bulk-lock every PUBLISHED entry for a class+subject+term (ADMIN/MANAGER). Irreversible. */
  lockTerm: (classId: string, subjectId: string, termId: string) =>
    `/core/api/v1/classes/${classId}/subjects/${subjectId}/terms/${termId}/lock`,
  /** `GET` all grade entries for a class+subject+term (TEACHER assigned / ADMIN / MANAGER). */
  listGrades: (classId: string, subjectId: string, termId: string) =>
    `/core/api/v1/classes/${classId}/subjects/${subjectId}/terms/${termId}/grades`,
  /** `GET` a student's grade entries across an academic year (STUDENT-self / PARENT / ADMIN / MANAGER). */
  memberGrades: (memberId: string) => `/core/api/v1/members/${memberId}/grades`,

  // ─── US-E14.4 — grade approval pipeline (admin, PERMANENTLY MOCK per ADR 0054) ───
  // Kept UNCHANGED — `grade-approval.repository.ts` still imports these; there
  // is no batchId-resolution path on the wire (ADR 0054 §2/§3), so these stay
  // the mock-fixture-only shape they always were.
  batches: (status?: string) =>
    status
      ? `/core/api/v1/grade-batches?status=${status}`
      : `/core/api/v1/grade-batches`,
  batchDetail: (id: string) => `/core/api/v1/grade-batches/${id}`,
  approveBatch: (id: string) => `/core/api/v1/grade-batches/${id}/approve`,
  requestRevision: (id: string) =>
    `/core/api/v1/grade-batches/${id}/request-revision`,
  bulkLock: () => `/core/api/v1/grade-batches/bulk-lock`,
  // US-E13.7 — parent child-switcher (permanently mock, ADR 0054):
  childList: "/core/api/v1/parent/children",
} as const;
