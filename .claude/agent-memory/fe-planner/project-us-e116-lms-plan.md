---
name: project-us-e116-lms-plan
description: US-E11.6 Student Lesson Player plan — new src/features/lms/ module, reuse-vs-new decision vs lesson-bank, route shape, key open questions
metadata:
  type: project
---

Plan written to `docs/stories/epics/E11-lms-exams/US-E11.6-student-lesson-player/plan.md`.

**Key decisions:**
- New feature module `src/features/lms/` (not `courses`, not extending
  `lesson-bank`). `lesson-bank`'s `LessonEntity` is teacher-facing single-file
  upload (fileType pdf|pptx|mp4|link, visibility, viewCount) — genuinely
  different concept from student-facing course→chapter→lesson hierarchy with
  per-student progress. Decision 0026 reuse bar is same-concept duplication,
  not superficial field overlap (`id`/`title`).
- Routes mirror `student/exams` precedent: `/t/[tenant]/(app)/student/courses`
  + `/student/courses/[courseId]`.
- `src/features/exam/` (US-E11.1) is the best precedent for mock-first
  student-consumption LMS feature structure (DI factory `makeRepo()` picks
  Mock vs real via `USE_MOCK`, RSC page + actions.ts).
- RBAC: story explicitly wants `requireRole(["student"])` on every action
  INCLUDING reads — `student/exams` precedent skips guards (relies on layout
  gating only), but `admin/academic-records/actions.ts` has the stricter
  pattern to copy. Recommended inline guard in `page.tsx` before DI call for
  read paths (RSC has no Server Action to wrap).
- Notes/Q&A (AC-12/13): kept domain-typed via thin repo methods on
  `ILmsRepository`, no separate use-case layer (pure pass-through, YAGNI) —
  flagged as open question in case fe-state-engineer prefers pure client
  local-state instead.
- Open questions flagged: i18n `courses` namespace collision (existing flat
  `courses: "Khoá học"` leaf at vi.json:1102 — verify path, not assumed
  same namespace), video keyboard-control faux-chrome vs real `<video>`,
  markLessonComplete re-trigger semantics (recommended no-op success).
- No `docs/product/design-spec.jsonc` entry exists for this screen —
  `design_src/edu/student.jsx` (COURSES + COURSE_LESSONS mock, StudentCourses,
  LessonPlayer, LessonBody components) + story AC are the normative source.
  Flagged to fe-lead as non-blocking follow-up to add a spec entry later.
