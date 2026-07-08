# US-E11.6 Plan — Student Lesson Player (Course Viewer with Chapter Navigation)

## 1. Summary

Two connected screens for the student role: `StudentCoursesScreen` (grid + tabs
by enrollment status) and `LessonPlayer` (2-col: content pane 60% + chapter nav
40%, with Notes/Q&A tabs and mark-complete). Mock-first (`lms` service not
shipped — decision `0014`), seeded from `design_src/edu/student.jsx`
(`COURSES` + `COURSE_LESSONS`, lines ~1-8 and ~122-164). No
`docs/product/design-spec.jsonc` entry exists for this screen — the mockup +
story AC/Design Notes are the normative source (see §9 below, flag to
`fe-lead`).

**Key decisions**

- **New feature module: `src/features/lms/`** (not `courses`, not fork of
  `lesson-bank`). Justification in §2.
- **New domain types**, do NOT reuse `lesson-bank`'s `LessonEntity` — it's a
  teacher-facing single-file-upload entity (`fileType: pdf|pptx|mp4|link`,
  `visibility`, `viewCount`). This US needs a student-facing hierarchy
  (course → chapter → lesson) with per-student progress (`done`, `active`,
  `type: video|pdf|text`). Field shapes and purpose diverge enough that
  forcing reuse would mean bolting unrelated fields onto a teacher-authoring
  entity. Detail in §2.
- **Routes**: `/t/[tenant]/(app)/student/courses` (list) and
  `/t/[tenant]/(app)/student/courses/[courseId]` (player) — matches the
  existing `student/exams` + `student/exams/[examId]` precedent
  (`src/app/[locale]/t/[tenant]/(app)/student/exams/`).
- **RBAC**: `requireRole(["student"])` in every Server Action (list courses,
  get course lessons, mark complete, save note, ask question) — per story
  explicit ask, following the `admin/academic-records/actions.ts` guard
  pattern (NOT the looser `student/exams` precedent, which skips the guard —
  story explicitly calls out RBAC as a requirement here, so we tighten it).
- Notes + Q&A: **no domain use-case layer** — pure mock/local persistence
  keyed by `lessonId`, justified in §2.4.

## 2. Feature module + reuse decision

### 2.1 Grep results (decision 0026 reuse check)

- `src/features/lesson-bank/` exists (US-E11.2, teacher-facing): `LessonEntity`
  = `{ id, title, description?, subjectId, subjectName, department?, fileType:
  "pdf"|"pptx"|"mp4"|"link", fileUrl, thumbnailUrl?, visibility, uploadedAt,
  authorId, authorName, viewCount }`. This models ONE uploaded artifact in a
  bank — no chapter grouping, no per-student done/progress state, no
  `video|pdf|text` content-type split (uses `fileType` instead, includes
  `pptx`/`link` which this US does not need but is missing `text` which this
  US does need for in-app scroll content).
- No `src/features/lms/` or `src/features/courses/` folder exists yet.
- `src/features/exam/` (US-E11.1) is the closest precedent for a **student
  consumption** mock-first LMS-adjacent feature (list → detail → complete/
  submit flow, `IExamRepository`, `MockExamRepository`, DI factory
  `makeXxxUseCase()` pattern, RSC page + `actions.ts`).

### 2.2 Verdict: new domain types in `src/features/lms/`

- **Module home = `src/features/lms/`** (per story's own suggestion + Design
  Notes UI-surfaces list already point there). Service map (`api-integration.md`)
  also names `lms` as the bounded context for "bài giảng, assignment, nội
  dung học" — course/lesson consumption belongs there, not a new `courses`
  top-level (would fragment the `lms` service consumers across two feature
  folders for no reason — `exam-bank`/`exam` are already both under the `lms`
  service umbrella and stay separate features by *product surface*, and
  "courses+lessons" is one coherent product surface, matching that pattern).
- **New entities**, not extending `lesson-bank`'s `LessonEntity`: the two
  represent different bounded concepts (teacher content-bank artifact vs.
  student-consumed course curriculum item with progress state). Force-reusing
  would require making `visibility`/`viewCount`/`fileType` optional-and-ignored
  on the student side and inventing `chapterId`/`done`/`active` as
  bolt-ons on a type literally named for a different actor's mental model.
  Per decision `0026` the reuse bar is for **actual duplication of the same
  concept**, not superficial field overlap (`title`, `id`). This is a new
  concept → new entity, in a new feature module (matches how `exam-bank`
  teacher authoring and `exam` student consumption stayed separate feature
  folders despite both being "exam" domain).
- If/when BE ships a real `lms` course endpoint, DTO mapping may reveal a
  shared "content item" sub-shape with lesson-bank — that's a future
  refactor, not a blocker now (YAGNI).

### 2.3 File layout

```
src/features/lms/
  domain/
    entities/
      course.entity.ts          # CourseEntity, CourseStatus, CourseSummary (list-view shape)
      chapter.entity.ts         # ChapterEntity (id, title, lessons[])
      lesson.entity.ts          # LessonContentEntity (id, chapterId, type: video|pdf|text, title, duration, done, order)
      lesson-note.entity.ts     # LessonNoteEntity (lessonId, content, updatedAt) — mock-local
      lesson-question.entity.ts # LessonQuestionEntity (id, lessonId, question, answer?, askedAt) — mock-local
    failures/
      lms.failure.ts            # not-found | forbidden | already-complete | unknown
    repositories/
      i-lms.repository.ts       # listCourses, getCourseLessons, markLessonComplete
                                 # (+ optional getNotes/saveNote, listQuestions/askQuestion —
                                 #   see 2.4 for whether these belong here or stay presentation-local)
    use-cases/
      list-courses.use-case.ts
      get-course-lessons.use-case.ts
      mark-lesson-complete.use-case.ts
      calculate-course-progress.ts   # pure fn: (done, total) -> { pct, status }
  infrastructure/
    dtos/
      course-response.dto.ts
      course-lessons-response.dto.ts
    mappers/
      lms.mapper.ts              # DTO -> CourseEntity / ChapterEntity[] / LessonContentEntity[]
    repositories/
      lms.repository.ts          # real HTTP impl (stub — lms service not shipped)
      mocks/
        lms.fixtures.ts          # seeded 1:1 from COURSES + COURSE_LESSONS in student.jsx
        lms.mock.repository.ts
  presentation/
    student-courses/
      student-courses-screen.i-vm.ts
      student-courses-screen.tsx
      course-card.tsx
      course-tabs.tsx
      courses-skeleton.tsx
      courses-empty.tsx
      student-courses-screen.stories.tsx
    lesson-player/
      lesson-player.i-vm.ts
      lesson-player.tsx
      lesson-body.tsx             # discriminated union switch: video|pdf|text
      chapter-list.tsx
      lesson-tabs.tsx              # Notes/Q&A tab shell
      notes-panel.tsx
      qna-panel.tsx
      lesson-player.stories.tsx
```

### 2.4 Notes / Q&A — no domain use-case layer

Story explicitly scopes these as mock-first, local, per-`lessonId`
persistence (AC-12/AC-13, Design Notes: `saveNote` mock local). Decision:
**give them a thin repository method on `ILmsRepository`** (`getNote`,
`saveNote`, `listQuestions`, `askQuestion`) rather than a separate
use-case layer — there's no business rule beyond "upsert by lessonId" /
"append to list", so a use-case wrapper would be pure pass-through
boilerplate (YAGNI). Keep them **domain-typed** (not purely client `useState`)
so the mock repository is the single source of truth and Storybook/tests can
assert persistence across lesson navigation (AC-12: "ghi chú còn lại khi quay
lại bài"). If `fe-state-engineer` prefers pure client-local state (no
server-action round-trip) for snappier UX, that's an acceptable simplification
— flag as an open question in §4, not a hard requirement.

## 3. Routes

```
src/app/[locale]/t/[tenant]/(app)/student/courses/
  page.tsx                # RSC — makeListCoursesUseCase, filter=all default (tabs are client-side)
  actions.ts               # 'use server' — none needed for list-only page (data fetched in RSC);
                            #   keep a markLessonCompleteAction stub here ONLY if shared; prefer colocating in [courseId]
  student/courses/[courseId]/
    page.tsx                # RSC — makeGetCourseLessonsUseCase(courseId)
    actions.ts               # 'use server' — markLessonCompleteAction, saveNoteAction, askQuestionAction
                              #   each starts with requireRole(["student"])
```

Matches existing `student/exams` + `student/exams/[examId]` precedent.

## 4. Mock-first repository plan

- `bootstrap/lib/mock.ts` `USE_MOCK` flag — unchanged, reuse existing helper.
- `MockLmsRepository implements ILmsRepository`:
  - `listCourses(studentId, filter?)` → returns `CourseSummary[]` seeded from
    `COURSES` (student.jsx lines 3-8) mapped to `{ id, name, teacher, color,
    icon, lessons, total, grade, progress }` → derive `status` via domain rule
    (`not-started | in-progress | completed`, Design Notes: `0<done<total` →
    in-progress, `done===total` → completed, `done===0` → not-started).
  - `getCourseLessons(courseId)` → returns chapters+lessons for course id `1`
    seeded 1:1 from `COURSE_LESSONS` (lines 122-164: 2 chapters, chapter 2
    `empty: true`); **all other course ids return an empty-chapters result**
    (matches mockup's "Giáo viên chưa tải lên nội dung…" fallback — this is
    itself a designed empty state, not a gap to fill).
  - `markLessonComplete(lessonId)` → mutates in-memory fixture `done: true`,
    returns updated lesson + recalculated course progress. Idempotent:
    already-`done` lesson → return current state (not an error) OR return
    `already-complete` failure — **decide in TDD**: story AC-11 says button
    "disabled" once done, implying UI prevents re-trigger, so treat repeated
    call as a no-op success rather than a failure (simpler contract).
  - `getNote(lessonId)` / `saveNote(lessonId, content)` — in-memory Map.
  - `listQuestions(lessonId)` / `askQuestion(lessonId, question)` — in-memory
    array, prepend on ask (AC-13: "xuất hiện đầu danh sách").
- `LmsRepository` (real impl) — stub wired to the 3 documented-but-not-yet-shipped
  endpoints below; will throw/never called while `USE_MOCK=true`. Written for
  contract-readiness per decision `0014`, not exercised by tests beyond
  envelope/error-mapping shape (mirrors `exam.repository.ts` treatment).

## 5. `bootstrap/endpoint/lms.endpoint.ts` (new)

```ts
export const LMS_EP = {
  courses: (status?: string) => `/lms/api/v1/courses${status ? `?status=${status}` : ""}`,
  courseLessons: (courseId: string) => `/lms/api/v1/courses/${courseId}/lessons`,
  completeLesson: (lessonId: string) => `/lms/api/v1/lessons/${lessonId}/complete`,
} as const;
```

Matches Design Notes' documented API list exactly. Register in
`bootstrap/endpoint/index.ts`. Does NOT extend `lesson-bank.endpoint.ts` (that
constant is teacher-bank scoped, `LESSON_BANK_EP`) — separate concern per §2.2.

## 6. RBAC

Every Server Action in `student/courses/actions.ts` and
`student/courses/[courseId]/actions.ts` starts:

```ts
"use server";
const guard = await requireRole(["student"]);
if (!guard.ok) return { ok: false, errorKey: "forbidden" };
```

Follows `admin/academic-records/actions.ts` pattern (not the looser
`student/exams` precedent which relies solely on layout gating) — story
explicitly calls out RBAC on every action including reads, so apply
consistently to `listCoursesAction`/`getCourseLessonsAction` too IF those data
fetches are pulled into Server Actions rather than RSC-direct DI calls. If
`fe-nextjs-engineer` fetches list/detail directly in the RSC `page.tsx` (no
action), the read-path RBAC is enforced by the `(app)` layout's existing
tenant/role gate — confirm this is sufficient or add an explicit
`requireRole` check inside the DI-calling page too (cheap, matches story
wording literally). Recommend: check in `page.tsx` directly before calling the
use-case, redirecting/404-ing on failure, to satisfy "including reads"
literally without forcing list/detail into Server Actions.

## 7. i18n — namespace `courses`

Key groups (exact copy owned by `fe-nextjs-engineer` + `docs/GLOSSARY.md`
conventions; enumerated here so nothing is missed):

- `courses.tabs.{all,inProgress,completed}` (+ count a11y label if needed)
- `courses.card.{teacherLabel, lessonsLabel, progressLabel, ctaStart, ctaContinue}`
- `courses.empty.{allTab, inProgressTab, completedTab}` (per-tab empty copy)
- `courses.player.breadcrumb.{coursesLink}`
- `courses.player.progress.{label, lessonsCount}`
- `courses.player.chapterList.{ariaLabel, emptyChapter, emptyCourse, nextButton}`
- `courses.player.lessonType.{video, pdf, text}`
- `courses.player.content.video.{lectureLabel, playAriaLabel, seekAriaLabel, fullscreenAriaLabel}`
- `courses.player.content.pdf.{title, downloadButton, downloadAriaLabel}`
- `courses.player.content.text.{conceptHeading, exampleHeading}` (or generic,
  since real text content will come from mock data, not static copy)
- `courses.player.markComplete.{button, doneLabel}`
- `courses.player.tabs.{notes, qna}`
- `courses.player.notes.{placeholder, saveButton, savedToast}`
- `courses.player.qna.{emptyState, askButton, inputPlaceholder, submitButton}`
- `courses.a11y.{chapterNavLabel, activeLessonState, doneLessonState}`

Add to BOTH `vi.json` and `en.json` under `courses` namespace (top-level
`courses` key already exists as a single string `"Khoá học"` at
`vi.json:1102`/`2153` per grep — **collision risk**: check whether that's a
flat leaf key used elsewhere (e.g. sidebar nav label) before nesting a
`courses.*` object under it; if the leaf `courses: "Khoá học"` string is used
elsewhere as `t("courses")` (likely a nav-namespace key, not the `courses`
top-level namespace), this is probably a different namespace path and no
collision — **flag to fe-nextjs-engineer to verify the exact JSON path before
adding the new namespace**, don't assume.

## 8. Component + state hints (for fe-component-architect / fe-state-engineer)

**Component architecture decisions needed:**
- `LessonBody` should be a discriminated-union render (`switch (lesson.type)`)
  producing 3 leaf components (`VideoPlayer`, `PdfPreview`, `TextContent`) —
  architect should decide whether these are `lms`-feature-local (single
  screen use today) or promotable later (decision `0026` — leave
  feature-local until a 2nd screen needs them).
- `ChapterList` needs collapsible state (per-chapter, AC-7 "trạng thái được
  giữ khi navigate bài khác") — local component state (`useState<Record<string,
  boolean>>`) is sufficient; NOT URL state (no requirement to deep-link a
  collapsed chapter).
- Video controls (AC-8: keyboard Space/Left/Right) — architect decides:
  faux-chrome only (matches mockup, no real `<video>` element since content is
  mock) vs a real HTML5 `<video>` wired to keyboard handlers. Given no real
  media URLs exist in mock-first, recommend faux-chrome with keyboard
  event handlers wired to visual seek-bar % state (satisfies AC-8 without a
  real media file dependency) — confirm with fe-lead if a real `<video>` +
  placeholder MP4 asset is preferred instead.

**State hints (fe-state-engineer):**
- TanStack Query key hierarchy:
  - `["lms", "courses", { status }]` — courses list.
  - `["lms", "course", courseId, "lessons"]` — chapter/lesson hierarchy + progress.
  - `["lms", "lesson", lessonId, "note"]` / `["lms", "lesson", lessonId, "questions"]` if Notes/Q&A go through query cache rather than pure local state.
- `markLessonComplete` is optimistic (AC-11: "optimistic"): mutate local query
  cache immediately (`done: true`, active pointer moves per mockup's `next`
  logic), roll back on Server Action failure. Must also bump the course-list
  query's cached progress (`["lms", "courses", ...]`) — cross-query
  invalidation or `setQueryData` on both keys.
- Server component (`page.tsx`) does the initial RSC fetch; client
  (`LessonPlayer`) hydrates via `initialData` into TanStack Query for
  subsequent optimistic mutations — mirrors patterns already used elsewhere
  in the repo (grep an existing RSC+TanStack hydration example if
  fe-state-engineer wants precedent, e.g. `teacher-dashboard` or `grades`).

## 9. TDD sequencing

1. **Red** `calculate-course-progress.test.ts` — pure fn: 0/partial/complete
   status derivation (3+ cases: 0 done, partial, all done; edge: total=0).
2. **Red** `mark-lesson-complete.use-case.test.ts` — ok (mark done), already-
   complete (no-op success per §4), not-found lesson id.
3. **Red** `list-courses.use-case.test.ts` (thin, mocks `ILmsRepository`) —
   pass-through + status filter branch if filtering happens use-case-side
   (vs. presentation-side tab filtering, which the mockup actually does
   client-side — recommend keeping filter client-side like the mockup, so
   this use-case may not even need a filter param; confirm with
   fe-component-architect).
4. **Red** `get-course-lessons.use-case.test.ts` — found course, not-found
   course, empty-chapters course.
5. **Red** `lms.mapper.test.ts` — DTO → chapter/lesson hierarchy incl. `done`/
   `active` state derivation from raw progress data.
6. **Red** `lms.mock.repository.test.ts` — fixture seed shape, markLessonComplete
   mutation persists across calls (in-memory), listQuestions prepend order.
7. Storybook interaction specs (AC-driven): `CoursesGrid_Loading`,
   `CoursesGrid_AllTab`, `CoursesGrid_InProgressTab`, `CoursesGrid_Empty`,
   `LessonPlayer_Video`, `LessonPlayer_Pdf`, `LessonPlayer_Text`,
   `ChapterList_Navigation`, `MarkComplete_Flow`, `Notes_Save`, `QA_Ask` — all
   already enumerated in the story's Validation table; engineer authors
   `play()` assertions per existing project convention (see US-E11.1/E11.5
   memory: storybook interaction runner has a known env-wide issue — author
   `play()` fns regardless per prior precedent, note if broken).

## 10. TEST_MATRIX.md

Row for US-E11.6 already exists at `docs/TEST_MATRIX.md:66` with status
`planned` and columns `no/no/no/no`. **No edit needed now** — engineer flips
status → `implemented` and fills columns when TDD proof lands, per
`.claude/rules/tdd.md`.

## 11. Risks, dependencies, open questions

- **[OPEN QUESTION]** i18n `courses` key collision — verify exact JSON path
  of the existing flat `courses: "Khoá học"` leaf (vi.json:1102, 2153) before
  nesting the new `courses.*` namespace object; likely a different parent
  namespace (e.g. `nav.courses` or `sidebar.courses`) but must confirm, not
  assume.
- **[OPEN QUESTION]** Video keyboard controls (AC-8) — faux-chrome + synthetic
  seek-bar state vs. real `<video>` element with placeholder media asset.
  Recommend faux-chrome (matches mockup, no real media in mock-first) but
  flag to fe-lead/component-architect to confirm since AC-8 says "seek bar,
  thời lượng" which could read as expecting real scrubbing.
- **[OPEN QUESTION]** Notes/Q&A: repository-backed (domain-typed, testable
  persistence-across-navigation) vs. pure client `useState` local storage.
  Recommend repository-backed per §2.4; fe-state-engineer may simplify.
- **[OPEN QUESTION]** `markLessonComplete` re-trigger semantics — no-op
  success (recommended) vs. `already-complete` failure. Story AC-11 implies
  the button disables so this is mostly moot for the happy path, but the
  use-case's contract still needs an explicit choice for direct testing.
- **[OPEN QUESTION]** RBAC on read paths — apply `requireRole` inline in
  `page.tsx` before the DI call (recommended, satisfies story literally) vs.
  rely on existing layout-level gating (matches `student/exams` precedent but
  under-delivers vs. story's explicit ask). Recommend the former since the
  story is explicit and the cost is trivial (one guard call, existing helper).
- **No `docs/product/design-spec.jsonc` entry exists** for `student/courses`
  or the lesson player. `student.jsx` + story AC/Design Notes are treated as
  normative per the task brief. **Flag to fe-lead**: consider adding a
  design-spec.jsonc entry post-implementation for consistency with other
  screens (non-blocking, docs-sync work, not part of this US's critical
  path — `docs/product/screens.md` update already tracked in story's Harness
  Delta section).
- Soft dependency US-E12.3 (subject catalogue) not required for course header
  — mockup uses subject/teacher names embedded in the course record itself
  (`COURSES` seed), no live subject-catalogue lookup needed for mock-first.
  If US-E12.3 ships first, no coupling forces a rework here (course entity
  carries its own denormalized subject/teacher display fields, matching the
  mockup).
- a11y: `<nav>`/`role="navigation"` for chapter list (AC-14) + `aria-current="page"`
  on active lesson — component-architect should wire this into `ChapterList`
  from the start, not bolt on later (per `.claude/rules/accessibility.md`).
- No new design-system tokens anticipated — all colors/spacing already exist
  in `tokens.css` per lane flags ("no new design tokens expected"); if a
  content-pane background (e.g. video faux-chrome dark background `#0f1117`
  in mockup) isn't an existing token, flag for ADR before hardcoding — check
  `tokens.css` for an existing dark-surface token first.
