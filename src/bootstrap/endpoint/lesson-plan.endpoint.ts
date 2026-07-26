/**
 * core service — LMS lesson-plan (`lessonplan` sub-domain) endpoints (US-E11.8).
 *
 * NEW FILE, additive — do NOT add to `lms.endpoint.ts` (that file is reserved
 * for the still-unbuilt `lms` service prefix `/lms/api/v1`; lesson-plan lives in
 * `core`). Routed through Kong (ADR 0030): `/core/api/v1/...` → Kong strips
 * `/core` → core receives `/api/v1/courseware/lesson-plans` (matches routes.go's
 * `app.Group("/api/v1/courseware/lesson-plans")`, re-ground-truthed 2026-07-26 after
 * the BE US-136 `/api/v1/lms/*` → `/api/v1/courseware/*` rename).
 */
export const LESSON_PLAN_EP = {
  list: "/core/api/v1/courseware/lesson-plans",
  create: "/core/api/v1/courseware/lesson-plans",
  detail: (id: string) => `/core/api/v1/courseware/lesson-plans/${id}`,
  update: (id: string) => `/core/api/v1/courseware/lesson-plans/${id}`,
  publish: (id: string) => `/core/api/v1/courseware/lesson-plans/${id}/publish`,
  bySubject: (subjectId: string) =>
    `/core/api/v1/courseware/lesson-plans/subject/${subjectId}`,
} as const;
