/**
 * LMS (course/lesson consumption) endpoints. Mock-first — the `lms` service is
 * not shipped yet (decision 0014); these mirror the documented contract so the
 * real repository is wiring-ready. Separate from `LESSON_BANK_EP` (teacher-side).
 */
export const LMS_EP = {
  courses: (status?: string) =>
    `/lms/api/v1/courses${status ? `?status=${status}` : ""}`,
  courseLessons: (courseId: string) =>
    `/lms/api/v1/courses/${courseId}/lessons`,
  completeLesson: (lessonId: string) =>
    `/lms/api/v1/lessons/${lessonId}/complete`,
  note: (lessonId: string) => `/lms/api/v1/lessons/${lessonId}/note`,
  questions: (lessonId: string) => `/lms/api/v1/lessons/${lessonId}/questions`,
  assignments: (studentId: string, statusFilter?: string) =>
    `/lms/api/v1/students/${studentId}/assignments${statusFilter && statusFilter !== "all" ? `?status=${statusFilter}` : ""}`,
  submitAssignment: (assignmentId: string) =>
    `/lms/api/v1/assignments/${assignmentId}/submissions`,
} as const;

/**
 * core service — `exercisebank` sub-domain (teacher Question Bank, US-E11.9).
 * REAL (ground-truthed against the running `core` source this session), routed
 * through Kong (ADR 0030): `/core/api/v1/...` → Kong strips `/core` → core
 * receives `/api/v1/lms/questions...`.
 *
 * Additive, per spec §6.1 — deliberately co-located here rather than a new
 * file. UNRELATED to `LMS_EP.questions` above (the per-lesson Q&A thread on the
 * still-unbuilt `lms` service) — do NOT confuse or merge the two.
 */
export const QUESTION_BANK_EP = {
  search: "/core/api/v1/lms/questions/search", // GET (cross-teacher PUBLISHED)
  list: "/core/api/v1/lms/questions", // GET (own) / POST (create)
  detail: (id: string) => `/core/api/v1/lms/questions/${id}`, // GET / PUT
  publish: (id: string) => `/core/api/v1/lms/questions/${id}/publish`, // PUT
} as const;
