/**
 * core service — LMS lesson-plan (`lessonplan` sub-domain) endpoints (US-E11.8).
 *
 * NEW FILE, additive — do NOT add to `lms.endpoint.ts` (that file is reserved
 * for the still-unbuilt `lms` service prefix `/lms/api/v1`; lesson-plan lives in
 * `core`). Routed through Kong (ADR 0030): `/core/api/v1/...` → Kong strips
 * `/core` → core receives `/api/v1/lms/lesson-plans` (matches routes.go's
 * `app.Group("/api/v1/lms/lesson-plans")`, ground-truthed 2026-07-17).
 */
export const LESSON_PLAN_EP = {
  list: "/core/api/v1/lms/lesson-plans",
  create: "/core/api/v1/lms/lesson-plans",
  detail: (id: string) => `/core/api/v1/lms/lesson-plans/${id}`,
  update: (id: string) => `/core/api/v1/lms/lesson-plans/${id}`,
  publish: (id: string) => `/core/api/v1/lms/lesson-plans/${id}/publish`,
  bySubject: (subjectId: string) =>
    `/core/api/v1/lms/lesson-plans/subject/${subjectId}`,
} as const;
