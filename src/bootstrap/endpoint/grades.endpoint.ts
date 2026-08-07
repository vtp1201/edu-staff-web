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
  /**
   * `POST` approve a PENDING_APPROVAL entry (ADMIN/MANAGER) — no body;
   * transitions `PENDING_APPROVAL → PUBLISHED`. WIRED in US-E18.46 (it was a
   * dormant constant with no caller before): the approver grade view
   * (`/admin/grade-book`, `/principal/grade-book`) calls it through
   * `ApproveColumnEntryUseCase`. Still nothing to do with the permanently-mocked
   * batch dashboard (ADR 0054).
   */
  approveEntry: (
    classId: string,
    subjectId: string,
    termId: string,
    studentId: string,
    columnId: string,
  ) =>
    `/core/api/v1/classes/${classId}/subjects/${subjectId}/terms/${termId}/grades/${studentId}/columns/${columnId}/approve`,
  /**
   * `POST` reject (request revision on) a PENDING_APPROVAL entry
   * (ADMIN/MANAGER) — US-E18.44 / BE US-184. Body `{reason}` (required, ≤500
   * chars); transitions `PENDING_APPROVAL → DRAFT`. Live only where core
   * migration `047_grade_entries_rejection` has run.
   */
  rejectEntry: (
    classId: string,
    subjectId: string,
    termId: string,
    studentId: string,
    columnId: string,
  ) =>
    `/core/api/v1/classes/${classId}/subjects/${subjectId}/terms/${termId}/grades/${studentId}/columns/${columnId}/reject`,
  /**
   * `GET` the tenant-wide rollup of batches awaiting approval (ADMIN/MANAGER —
   * US-E18.46, BE US-186). Deliberately TOP-LEVEL, not nested under
   * `/classes/{classId}/…`: the access pattern is tenant-wide and the tenant
   * comes from the verified JWT claim, never a path/query param. Query
   * `?cursor=&limit=`; the response's pagination lives in `meta.pagination`, so
   * callers must read it with `{ raw: true }` + `parseEnvelope`.
   */
  pendingApprovalBatches: () => `/core/api/v1/grade-entries/pending-approval`,
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
  /**
   * `GET` the parent's own linked students (BE US-148). Enriched with
   * `classId`/`className`; carries NO display name (resolved separately, see
   * `ParentChildListRepository`). PARENT may only pass its OWN memberId.
   */
  linkedStudents: (memberId: string) =>
    `/core/api/v1/members/${encodeURIComponent(memberId)}/linked-students`,
} as const;
