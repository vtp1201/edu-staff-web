/**
 * core service — LMS exam-bank (đề thi / ngân hàng đề) endpoints.
 * Ground-truthed against the running Go server
 * (`services/core/internal/lms/exambank/adapter/http/routes.go`) — NOT
 * `openapi.yaml`, whose `ExamBank` write-path schema is drifted (US-E18.15/ADR
 * 0056). Routed through Kong (ADR 0030): `/core/api/v1/...` → Kong strips `/core`
 * → core receives `/api/v1/courseware/exam-papers`.
 *
 * Since core US-152 (US-E18.28/ADR 0056 Amendment 2) the paper-level PATCH/
 * DELETE and the per-question PUT/DELETE exist and ARE wired: `detail(id)`
 * serves GET, PATCH (metadata) and DELETE (hard-delete a DRAFT); `questions(id)`
 * serves the append-one POST; `question(id, questionId)` serves the per-question
 * PUT/DELETE. `create` (metadata-only POST) stays unwired — there is still no
 * bulk/inline-questions create, so `createExam` remains a blocked stub.
 */
export const EXAM_BANK_EP = {
  list: "/core/api/v1/courseware/exam-papers",
  // GET one · PATCH metadata (DRAFT, author) · DELETE (DRAFT, author).
  detail: (id: string) => `/core/api/v1/courseware/exam-papers/${id}`,
  // DRAFT→PUBLISHED / PUBLISHED→CONFIDENTIAL transition (wired: publish only).
  status: (id: string) => `/core/api/v1/courseware/exam-papers/${id}/status`,
  // Not wired (metadata-only create — no bulk-create endpoint exists).
  create: "/core/api/v1/courseware/exam-papers",
  // POST: append ONE question to a DRAFT.
  questions: (id: string) =>
    `/core/api/v1/courseware/exam-papers/${id}/questions`,
  // PUT: replace one question's content · DELETE: remove it (positions renumber).
  question: (id: string, questionId: string) =>
    `/core/api/v1/courseware/exam-papers/${id}/questions/${questionId}`,
} as const;
