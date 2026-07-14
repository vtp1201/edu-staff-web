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
