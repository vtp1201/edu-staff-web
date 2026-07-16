/**
 * Teaching-plan (PPCT) endpoint constants — `core` service, `lms` sub-router
 * (US-E11.4 / US-E18.9).
 *
 * Real contract ground-truthed for US-E18.9 against
 * `edu-api/services/core/docs/openapi.yaml` (`TeachingPlan (LMS)` tag) +
 * Go source (`internal/lms/teachingplan/adapter/http/routes.go`): all routes
 * are nested under `/api/v1/lms/teaching-plans` (not `/api/v1/teaching-plans`
 * as the pre-US-E18.9 guess had it), matching the epic's foundational finding
 * #2 (`lms` lives inside `core`, mounted at `/core/api/v1/lms/*` through Kong).
 *
 * Kept accurate for documentation even though the real repository never calls
 * these — the whole feature stays mock-first permanently (see
 * `teaching-plan.repository.ts`'s class doc + cross-repo ask #14,
 * `EPIC-OVERVIEW.md`):
 * - `list`/`get`/`submit`/`approve`/`reject` require `classSubjectId` +
 *   `academicYear` query params completing the primary key — the web domain
 *   key is `(subjectId, classId, term)`, a genuinely different granularity
 *   (one BE plan spans a full academic year across ALL terms; the web screen
 *   is per-term). `classSubjectId` itself IS resolvable (reuse
 *   `CLASS_EP.classSubjects(classId)`, the pattern `principal-teachers.repository.ts`
 *   already uses) but `academicYear` vs `term` is not a lossless remap.
 * - There is **no `/cells` (or any) endpoint for editing an existing plan's
 *   entries** — `create` takes the full `weeklyEntries` array once; the
 *   domain entity has an `UpdateEntries()` method (confirmed in
 *   `core/domain/entity/teaching_plan.go`) but it is never wired to any
 *   use-case or HTTP route. Web's per-cell autosave (`savePlanCell`) has zero
 *   wire equivalent, not just a missing path segment.
 * - `WeeklyEntryResponse` = `{ weekNumber, topic, notes }` — no `period` axis
 *   at all; web's grid is `weeks × periodsPerWeek`.
 * - Real `status` enum is `DRAFT | SUBMITTED | APPROVED` — no `REJECTED`;
 *   reject transitions back to `DRAFT` with `rejectReason` set.
 */
export const TEACHING_PLAN_EP = {
  create: "/core/api/v1/lms/teaching-plans",
  list: "/core/api/v1/lms/teaching-plans",
  get: (id: string) => `/core/api/v1/lms/teaching-plans/${id}`,
  submit: (id: string) => `/core/api/v1/lms/teaching-plans/${id}/submit`,
  approve: (id: string) => `/core/api/v1/lms/teaching-plans/${id}/approve`,
  reject: (id: string) => `/core/api/v1/lms/teaching-plans/${id}/reject`,
} as const;
