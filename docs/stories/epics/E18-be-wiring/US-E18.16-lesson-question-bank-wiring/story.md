# US-E18.16 LMS lesson-plan + question-bank wiring — descoped, no wireable web feature exists

## Status

planned

(Left `planned`, not `implemented` — no code was written. See `## Disposition`.)

## Lane

normal

(hard-gate check: no auth/RBAC change, no token/session change, no tenant
isolation change, no data-loss risk, no PII, no validation change, no new
design-system token — because no code changes at all. Purely a ground-truth
finding + epic-doc correction.)

## Dependencies

- Depends on: none.
- Blocks: none known.
- Feature module(s) chạm: none (`src/` untouched). Docs only:
  `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md`,
  `docs/TEST_MATRIX.md`, this packet.
- Shared contract/file: none.

## Product Contract

The epic table (`EPIC-OVERVIEW.md` row, pre-correction) assumed: `"lessons"→
"/lms/lesson-plans"` (+ `publish`, `/subject/{id}`); `questions` has `/search`
+ `/publish`; `courses`/lesson-complete/notes stay mock. This story was
supposed to swap the web's mock-first "lessons" and "questions" repositories
to consume the real `edu-api` `lessonplan` and `exercisebank` (question bank)
services under `core`, per the epic's playbook (ground-truth Go source → remap
path/DTO → map errors → keep mock fallback → proof → `ensureFreshSession`).

**Ground-truth of the BE side (`edu-api/services/core/internal/lms/{lessonplan,exercisebank}`)**
confirms the real contract exists and is well-formed:

- `lessonplan`: `POST/GET /api/v1/lms/lesson-plans` (create DRAFT / list own),
  `GET /:id` (visibility-gated), `PUT /:id` (update DRAFT), `PUT /:id/publish`
  (DRAFT→PUBLISHED), `GET /subject/:subjectId` (browse PUBLISHED by subject).
  `LessonPlanResponse`: `planId, teacherId, subjectId, gradeLevel, title,
  objectives, contentOutline, activities, assessmentMethod, status
  (DRAFT|PUBLISHED), tags, publishedAt, createdAt, updatedAt` — a structured
  teaching-plan **document** with a one-way publish workflow. 11-code
  `LESSON_PLAN_*` error taxonomy (`ERROR_CODES.md:337-346`).
- `exercisebank` (question bank): `GET /api/v1/lms/questions/search`
  (PUBLISHED, staff-only, requires ≥1 of `subjectId`/`tag`, else
  `422 QUESTION_SEARCH_FILTER_REQUIRED`), `POST/GET /api/v1/lms/questions`
  (create DRAFT / list own), `GET/PUT /:id` (read/update DRAFT),
  `PUT /:id/publish`. `QuestionResponse`: `id, tenantId, authorId,
  questionType (ESSAY|SHORT_ANSWER|FILL_IN), subjectId, gradeLevel,
  difficulty (EASY|MEDIUM|HARD), body, expectedAnswer, status
  (DRAFT|PUBLISHED), tags, createdAt, updatedAt, publishedAt` — a reusable
  exam-question **bank** entry (explicitly NOT MCQ — that's the separate Exam
  Bank / US-054, already wired in US-E18.15). ~12-code `QUESTION_*` error
  taxonomy (`ERROR_CODES.md:457-468`).

**Ground-truth of the web side finds no wireable feature for either scope**:

1. **`"lessons"` does NOT map to `lesson-plans`.** The only web feature named
   "lesson" is `src/features/lesson-bank` (screen: `(app)/teacher/lesson-bank`,
   `docs/product/screens.md` "🎨 design-ready", `design_src/edu/lesson-bank.jsx`).
   Its `LessonEntity` (`id, title, description, subjectId, subjectName,
   department, fileType [pdf|pptx|mp4|link], fileUrl, thumbnailUrl,
   visibility [private|dept|school], uploadedAt, authorId, authorName,
   viewCount`) is a **file-sharing resource repository** — teachers
   upload/browse PDFs, slide decks, videos, or links, scoped by
   department/school visibility. It shares zero fields with
   `LessonPlanResponse` beyond `subjectId`/`title`, and neither side
   models the other's core concept (`lesson-bank` has no
   `objectives`/`contentOutline`/`activities`/`assessmentMethod`/`gradeLevel`/
   `status`/`tags`/publish-workflow; `lesson-plans` has no
   `fileUrl`/`fileType`/`visibility`/`department`/`viewCount`). This is not a
   "drift, remap the DTO" case like every prior US in this epic — it is two
   **unrelated domain objects** that happen to share the English word
   "lesson". There is no lossless mapping in either direction (same modeling-
   gap class as US-E18.9's teaching-plan term×period grid and US-E18.11's
   self-view — "flagged for `uiux`/`ba`, not resolvable by `fe` alone").
2. **No web feature exists at all for a teacher-facing reusable question
   bank** (create ESSAY/SHORT_ANSWER/FILL_IN questions, search PUBLISHED by
   subject/tag, publish). Confirmed by exhaustive grep across
   `src/features/*` and `docs/product/{screens.md,design-spec.jsonc}` — the
   only "question"-named code is (a) `src/features/exam-bank` (MCQ exam
   papers, wired in US-E18.15 — a different BE service, `exambank`, not
   `exercisebank`), and (b) `LMS_EP.questions` in
   `src/bootstrap/endpoint/lms.endpoint.ts` — an unrelated per-lesson **Q&A
   comment thread** (`ListQuestionsUseCase`/`AskQuestionUseCase`,
   `LessonQuestionEntity`, part of the student `lesson-player`'s "Q&A" tab —
   no `subjectId`/`gradeLevel`/`difficulty`/`status`, nothing to remap).
   There is no mock repository, no DTO, no screen — nothing to "swap
   mock→real" for the question bank at all.

## Disposition — descoped, no code changes

Consistent with this epic's established precedent for a modeling gap that
"needs a product/design decision, not resolvable by `fe` alone" (US-E18.9
finding #14, US-E18.11 finding #15): **no repository, DI, DTO, or UI code was
written for this story.** There is nothing to wire — not a partially-blocked
hybrid (like US-E18.5/US-E18.8/US-E18.9/US-E18.13/US-E18.15), because those
all had an *existing* mock feature/screen to remap. Here, neither sub-scope
has a pre-existing web feature to touch:

- `lesson-bank` stays exactly as-is (mock-first, file-sharing feature,
  unrelated to `lesson-plans`). Zero change.
- No question-bank repository/screen is created. Zero change.
- `courses`/lesson-completion/notes (the one part of the epic table's note
  that WAS actionable) already stay mock by design — confirmed already true,
  no action needed (`src/features/lms` untouched, matches the epic's
  "KHÔNG thuộc wave này" exclusion list, §146 of `EPIC-OVERVIEW.md`).

**If a "teacher lesson-plan authoring" screen or a "teacher question bank"
screen is a real product requirement**, it is net-new UI (not a mock→real
transport swap) and belongs to `/uiux` (wireframe + design-spec entry) →
`/ba` (requirements + AC) → `/fe` (implementation) — the normal delivery
chain, not this BE-wiring epic. This story documents the ground-truth finding
so a future `/uiux`/`/ba` pass can start from an accurate BE contract summary
(above) instead of re-discovering it.

## Design Notes

None — no UI touched.

## Cross-repo / product findings (appended to `EPIC-OVERVIEW.md` §Cross-repo requests as #27)

27. **(US-E18.16, 2026-07-17)** `"lessons"→"/lms/lesson-plans"` (epic table's
    original naming assumption) is a false match: the web's only "lesson"
    feature (`lesson-bank`, file-sharing/resource-repository) and BE's
    `lesson-plans` (structured DRAFT→PUBLISHED planning document with
    objectives/contentOutline/activities/assessmentMethod) are unrelated
    domain models with zero lossless field overlap. Separately, no web
    feature (mock or otherwise) exists for BE's `exercisebank` question-bank
    service (`/lms/questions/search` + CRUD/publish) at all — the only
    "questions" code in the repo is an unrelated per-lesson Q&A comment
    thread. Not a BE gap — BE ships both contracts cleanly (11-code
    `LESSON_PLAN_*` + ~12-code `QUESTION_*` taxonomies, ground-truthed from
    `ERROR_CODES.md`/Go source). This is a product/design-scope gap: net-new
    "teacher lesson-plan authoring" and "teacher question bank" screens would
    need to be designed from scratch (`/uiux` → `/ba` → `/fe`), not wired as
    a transport swap. No code changed in this story.

## Validation

No code, no test changes. Full-suite proof is unchanged from the US-E18.15
baseline (report the delta as zero):

| Layer | Expected proof |
| --- | --- |
| Unit | n/a — no code |
| Integration | n/a — no code |
| E2E | n/a — no code |
| Platform | `bun run build` re-run for sanity, unchanged output |
| Release | epic finding registered, `EPIC-OVERVIEW.md` + `TEST_MATRIX.md` updated |

## Harness Delta

- `EPIC-OVERVIEW.md`: corrected the Wave-3 table row for US-E18.16 with the
  ground-truth finding; appended finding #27 to §Cross-repo requests.
- `docs/TEST_MATRIX.md`: added a row for US-E18.16 documenting the descope
  (status `planned`, all proof flags `no`/`n/a`, since there is nothing to
  verify).
- Harness story registered via `harness-cli story add`/`update` with
  `--status planned`, `--unit 0 --integration 0 --e2e 0 --platform 0`.

## Evidence

- Ground-truth reads: `edu-api/services/core/internal/lms/lessonplan/adapter/http/{routes.go,dto/request.go,dto/response.go}`,
  `edu-api/services/core/internal/lms/exercisebank/adapter/http/routes.go`,
  `edu-api/services/core/docs/openapi.yaml` (`LessonPlanResponse`,
  `CreateLessonPlanRequest`/`UpdateLessonPlanRequest`, `QuestionResponse`,
  `CreateQuestionRequest`/`UpdateQuestionRequest`, `/lms/questions/search`),
  `edu-api/services/core/docs/ERROR_CODES.md` (LESSON_PLAN_*, QUESTION_* rows).
- Web-side reads: `src/features/lesson-bank/**` (entity/repository), grep
  across `src/features/*` + `src/bootstrap/endpoint/*` for
  `lesson-plan`/`question`/`exercise-bank` naming, `docs/product/screens.md`,
  `docs/product/design-spec.jsonc` (no entries for either concept).
- `bun run build` (`NEXT_PUBLIC_USE_MOCK=`): green, unchanged from baseline
  (no source touched).
- `bunx vitest run`: 307 files / 1950 tests pass — unchanged from the
  US-E18.15 baseline (no source touched).

Not merge-owner-blocking — `fe-lead` closes this story directly (docs-only,
no review/a11y/design-review/QA gate applicable since there is no UI/code
diff to review).
