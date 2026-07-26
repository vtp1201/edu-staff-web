/**
 * core service — LMS exam-bank (đề thi / ngân hàng đề) endpoints.
 * Ground-truthed against the running Go server
 * (`services/core/internal/lms/exambank/adapter/http/routes.go`) — NOT
 * `openapi.yaml`, whose `ExamBank` write-path schema is drifted (US-E18.15/ADR
 * 0056). Routed through Kong (ADR 0030): `/core/api/v1/...` → Kong strips `/core`
 * → core receives `/api/v1/courseware/exam-papers`.
 *
 * Only 5 routes exist. `create`/`questions` are defined for documentation + the
 * day the write path unblocks, but are NOT wired in Option A (no metadata-update,
 * no question-replace/edit/delete, no DELETE endpoint exists at all — create/
 * update/delete are blocked stubs in the real repository).
 */
export const EXAM_BANK_EP = {
  list: "/core/api/v1/courseware/exam-papers",
  detail: (id: string) => `/core/api/v1/courseware/exam-papers/${id}`,
  // DRAFT→PUBLISHED / PUBLISHED→CONFIDENTIAL transition (wired: publish only).
  status: (id: string) => `/core/api/v1/courseware/exam-papers/${id}/status`,
  // Not wired in Option A (append-one-question / metadata create).
  create: "/core/api/v1/courseware/exam-papers",
  questions: (id: string) =>
    `/core/api/v1/courseware/exam-papers/${id}/questions`,
} as const;
