# DR-021 — Lesson Plan Authoring + Question Bank (net-new)

## Status

- [x] delivered (2026-07-17)

## Design-review gate (uiux-lead self-audit, 2026-07-17)

`/impeccable`-style audit performed manually against `.claude/rules/accessibility.md`
+ `.claude/rules/design-system.md` (no live impeccable CLI session in this run;
checked the same criteria it enforces):

- **Contrast**: DRAFT/PUBLISHED badges reuse `exam-bank.jsx`'s proven-AA
  warning/success token pairing (`LPStatusChip`/`QBStatusChip`); difficulty
  tiers (EASY/MEDIUM/HARD) reuse the existing GPA-tier success/warning/error
  mapping. Inline field errors and the "unsaved" indicator use `T.errorText`/
  `T.warningText` (contrast-safe text tokens per ADR `0027`/`0046`), never
  `T.error`/`T.warning` raw background hues on text.
- **Status not color-only**: every status/type/difficulty badge pairs an icon
  with a text label (`Icon name=... + label`); the question-bank mandatory-
  filter indicator pairs `check`/`alertTriangle` icons with text, not color
  alone.
- **Motion-safe**: both files gate all transitions/animations behind
  `@media (prefers-reduced-motion: reduce)` (verified at 2 locations each).
- **Keyboard/focus**: form fields use standard inputs/selects/textareas
  (native focus ring); inline errors wired via `id` + `role="alert"` for
  `aria-describedby` association (`lp-title-err`, `lp-{section}-err`,
  `qb-body-err`, `qb-answer-err`).
- **States coverage**: both screens implement loading (`EduSkeleton`), empty
  (`EduEmpty` — distinct "no results" vs "no items yet" copy), error
  (`EduError` + retry), and question-bank's screen-specific required-filter
  prompt (`QBFilterRequiredPrompt`, visually distinct dashed-border card, not
  reusing the generic empty state) — the 422 `QUESTION_SEARCH_FILTER_REQUIRED`
  gate modeled client-side per the DR's BE-contract note.
- **Mobile-first**: builder layouts documented as 2-col→1-col (lesson-plan,
  <860px) and single-col-only (question-bank) in `design-spec.jsonc`; card
  grids use `repeat(auto-fill, minmax(...))` / row-list patterns proven at
  320–375px in `exam-bank.jsx`/`lesson-bank.jsx`.
- **Both `.jsx` files verified to parse as valid JSX** (esbuild `transformSync`,
  no syntax errors) and export their components on `window`
  (`LessonPlanScreen`/`LessonPlanBuilderScreen`,
  `QuestionBankScreen`/`QuestionBankBuilderScreen`).
- **i18n integrity**: `vi.json`/`en.json` re-parsed after all edits — valid
  JSON, exact key-parity (80 `lessonPlan` / 94 `questionBank` leaf keys each).
  `uiux-lead` found and fixed several `i18nKey` annotation mismatches in
  `design-spec.jsonc` between `uiux-designer`'s guessed key shapes and
  `uiux-ux-writer`'s actually-landed keys (documented in commit `affb364`),
  and added 7 small additive `questionBank` keys the designer's scope-toggle
  + mandatory-filter-indicator UI needed (`scopeToggle.*`,
  `filter.allGrades`/`gradeAriaLabel`, `filter.mandatorySatisfied`/
  `mandatoryRequired`) that the writer's first pass hadn't scoped.
- **Zero new tokens** confirmed — no edits to `src/app/tokens.css` or
  `src/app/globals.css` in this DR.

**Verdict: Pass.** No blocking findings. Two non-blocking open items carried
to `/ba`: (1) `uiux-ux-writer`'s question of whether `expectedAnswer` should
be optional for SHORT_ANSWER/FILL_IN if BE allows a null value; (2) minor
cross-namespace Vietnamese terminology drift for "published" (`examBank` ships
"Đã publish" while `lessonPlan`/`questionBank` ship "Đã phát hành") — flagged,
not unified in this DR since `examBank`'s copy is already in production use
and out of this DR's scope to touch.

## Origin

Finding #27 (`docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md`, story
`docs/stories/epics/E18-be-wiring/US-E18.16-lesson-question-bank-wiring/story.md`,
2026-07-17). US-E18.16 ground-truthed two real, well-formed `edu-api` LMS
contracts (`core` service) with **no corresponding web feature or screen at
all**:

1. **Teacher lesson-plan authoring** — a structured DRAFT→PUBLISHED planning
   document (`lessonplan` sub-domain). NOT the existing `lesson-bank`
   (file-sharing repository — different domain, zero field overlap, stays
   untouched).
2. **Teacher question bank** — a reusable ESSAY/SHORT_ANSWER/FILL_IN question
   repository with mandatory subject/tag search filter (`exercisebank`
   sub-domain). NOT the existing `exam-bank` (MCQ exam papers, a different BE
   service, already wired US-E18.15) and NOT the per-lesson Q&A comment
   thread in `lesson-player` (`LMS_EP.questions`, unrelated).

This DR is net-new UI design for both, so `/ba` can then write engineering
AC and `/fe` can build against real contracts instead of inventing fields the
API can't persist.

## Lane

**Normal.** No new design-system token, palette, or layout primitive expected
— both screens reuse the exam-bank builder family (list + filter bar + 2-col
create/edit builder, `StatusBadge`, `EmptyState`, card grid) already proven at
`design_src/edu/exam-bank.jsx`. If a genuine new token need surfaces during
design, flag it to `uiux-lead` for an ADR — do not invent inline.

## Already-implemented check (done by uiux-lead before this DR)

Confirmed **not implemented** — this is genuine net-new authoring, not a
reconcile:
- `src/features/lesson-bank/**` exists but is the unrelated file-sharing
  feature (`LessonEntity`: fileType/fileUrl/visibility/department/viewCount).
  Zero mapping to `LessonPlanResponse` (objectives/contentOutline/activities/
  assessmentMethod/gradeLevel/status/tags/publish workflow).
- `src/features/exam-bank/**` exists but models MCQ exam papers, a different
  BE service (`exambank`, not `exercisebank`).
- `LMS_EP.questions` in `src/bootstrap/endpoint/lms.endpoint.ts` is the
  unrelated per-lesson Q&A thread (`LessonQuestionEntity` — no subjectId/
  gradeLevel/difficulty/status).
- No repository, DTO, mock data, screen route, or i18n keys exist for either
  "lesson plan" or "question bank" (grepped `src/features/*`,
  `docs/product/screens.md`, `docs/product/design-spec.jsonc` — no hits).
- **Consequence:** full pipeline authoring is warranted, BUT this DR takes the
  lean-pipeline shortcut established in DR-020 (skip
  `uiux-product-manager`/`uiux-researcher`/`uiux-wireframe-designer`/
  `uiux-brainstormer`/`uiux-design-system-builder`) because the layout pattern
  is already fully established and validated by `exam-bank.jsx` (list +
  filter bar + owner toggle + 2-col builder) and `lesson-bank.jsx` (card grid
  + slide-in drawer/detail sheet) — reusing a proven direction, not
  inventing one. `uiux-designer` adapts these patterns to the two new field
  schemas below; no new research/wireframe/brainstorm needed.

## BE contract summary (ground-truthed, from US-E18.16 packet — read before designing)

### 1. Lesson Plan (`lessonplan` sub-domain, `core` service)

Routes: `POST/GET /api/v1/lms/lesson-plans` (create DRAFT / list own),
`GET /:id` (visibility-gated), `PUT /:id` (update — DRAFT only), `PUT /:id/publish`
(one-way DRAFT→PUBLISHED), `GET /subject/:subjectId` (browse PUBLISHED by
subject — cross-teacher).

`LessonPlanResponse` fields: `planId, teacherId, subjectId, gradeLevel, title,
objectives, contentOutline, activities, assessmentMethod, status
(DRAFT|PUBLISHED), tags, publishedAt, createdAt, updatedAt`.

- `objectives`, `contentOutline`, `activities`, `assessmentMethod` — free-text/
  structured document sections (design as multi-line text areas or structured
  list editors — do NOT invent a richer schema than these 4 named sections).
- Publish is **one-way** (no unpublish/revert modeled) — design the publish
  action as an irreversible confirm (reuse the exam-bank builder's "Xuất bản"
  confirm pattern).
- Once PUBLISHED, `PUT /:id` presumably still gated to DRAFT-only per BE — design
  the edit form as read-only/locked once PUBLISHED (mirror exam-bank's
  published-exam lock behavior) unless `/ba` later clarifies otherwise.
- 11-code `LESSON_PLAN_*` error taxonomy — `edu-api/services/core/docs/ERROR_CODES.md:337-346`.
  Design generic error-banner + inline field-error states; `/ba` will map exact
  codes to messages.
- No delete endpoint ground-truthed — do not design a destructive delete CTA
  beyond what the contract supports (flag as a gap if BA needs one later).

### 2. Question Bank (`exercisebank` sub-domain, `core` service)

Routes: `GET /api/v1/lms/questions/search` (**staff-only**, PUBLISHED only,
**requires ≥1 of `subjectId`/`tag`** else `422 QUESTION_SEARCH_FILTER_REQUIRED`
— design the search/filter bar so at least one filter is mandatory before
results render, with a clear "chọn môn học hoặc thẻ để tìm" empty/prompt
state, not a silent empty grid), `POST/GET /api/v1/lms/questions` (create
DRAFT / list own), `GET/PUT /:id` (read/update DRAFT), `PUT /:id/publish`.

`QuestionResponse` fields: `id, tenantId, authorId, questionType
(ESSAY|SHORT_ANSWER|FILL_IN), subjectId, gradeLevel, difficulty
(EASY|MEDIUM|HARD), body, expectedAnswer, status (DRAFT|PUBLISHED), tags,
createdAt, updatedAt, publishedAt`.

- **No MCQ options array on the wire** — do NOT design an options-editor UI
  (cross-repo ask #24 already flagged this gap to BE; out of scope here).
  Only 3 types: Essay (long free text), Short Answer (short free text),
  Fill-in-the-blank (body with blank markers + expectedAnswer).
- `difficulty` (EASY/MEDIUM/HARD) has no color precedent yet in this repo for
  question difficulty — reuse the neutral 3-tier badge pattern from
  `--edu-success`/`--edu-warning`/`--edu-error` the same way GPA tiers do
  (Dễ→success, Trung bình→warning, Khó→error) — this mirrors an EXISTING
  token mapping (score/GPA convention in `.claude/rules/design-system.md`),
  not a new one.
- ~12-code `QUESTION_*` error taxonomy —
  `edu-api/services/core/docs/ERROR_CODES.md:457-468`, including the search
  422. Design an inline "select at least one filter" validation state on the
  search screen distinct from the generic error banner.
- `tag` is a free-text/multi-value field on both create and search — design a
  tag-chips input control (reuse the tag-pill visual language already present
  in exam-bank/lesson-bank cards if any, else a simple comma-chip input).

## Design scope (what to build)

Two screens, one DR (bundled per the DR-014/DR-018 precedent of grouping
closely-related net-new US under one DR when there's no branch/file
contention and they share one BE-wiring finding):

### Screen A — Teacher Lesson Plan Authoring
- Route family (propose, confirm with `/ba`): `/teacher/lesson-plans` (list,
  own DRAFT+PUBLISHED + browse-by-subject toggle), `/teacher/lesson-plans/create`,
  `/teacher/lesson-plans/:id/edit` (builder).
- List: card grid (mirror `lesson-bank.jsx` grid) — title, subject chip, grade,
  status badge (DRAFT/PUBLISHED — 2-value StatusBadge, reuse `warning`/
  `success` mapping already established for draft/published in exam-bank),
  tags, updated date. Filter bar: subject dropdown, grade dropdown, status
  filter, search. Owner toggle "Của tôi / Toàn trường" like exam-bank/lesson-bank
  (own DRAFT+PUBLISHED vs school PUBLISHED-only browse via `/subject/:id`).
- Builder (2-col, mirror `ExamBuilderScreen` layout): left = plan meta
  (title/subject/gradeLevel/tags), right = the 4 document sections
  (objectives/contentOutline/activities/assessmentMethod) as labeled textareas
  or structured list editors. Publish CTA = one-way confirm dialog. Locked/
  read-only view once PUBLISHED.
- States: loading (skeleton grid), empty (no plans yet — CTA to create),
  error (banner + retry), DRAFT vs PUBLISHED visual distinction, validation
  errors per field (11-code taxonomy → generic + field-level banners).
- Output: `design_src/edu/lesson-plan.jsx` (component `LessonPlanScreen` +
  `LessonPlanBuilderScreen`), `docs/product/design-spec.jsonc` entry
  `screens.lessonPlan`, i18n namespace `lessonPlan`.

### Screen B — Teacher Question Bank
- Route family (propose, confirm with `/ba`): `/teacher/question-bank` (list +
  mandatory-filter search), `/teacher/question-bank/create`,
  `/teacher/question-bank/:id/edit` (builder).
- List: mirror exam-bank list layout — filter bar with subject dropdown + tag
  input **required before results show** (422 gate), plus optional
  questionType/difficulty/status filters. Cards: question type badge (Tự
  luận/Trả lời ngắn/Điền khuyết), difficulty badge (3-tier
  success/warning/error), subject chip, grade, status badge (DRAFT/
  PUBLISHED), tags, truncated body preview.
- Builder: single-col form — questionType selector, subject/grade, difficulty,
  body (textarea, longer for essay), expectedAnswer (textarea/short input
  depending on type), tag-chips input, publish confirm (one-way, mirror
  lesson-plan/exam-bank pattern).
- States: same set as Screen A, PLUS the specific "select at least one filter"
  prompt state on the search screen (distinct from generic empty-state —
  this is a required-input prompt, not "no results").
- Output: `design_src/edu/question-bank.jsx` (component `QuestionBankScreen` +
  `QuestionBankBuilderScreen`), `docs/product/design-spec.jsonc` entry
  `screens.questionBank`, i18n namespace `questionBank`.

## Design-system supremacy reminder

Tokens-only. Reuse existing patterns — do not invent new card/badge/builder
layouts. Confirmed zero new tokens needed: DRAFT/PUBLISHED reuses the
existing warning/success 2-value convention (exam-bank), 3-tier difficulty
reuses the existing GPA-tier success/warning/error convention
(`.claude/rules/design-system.md` §Score/performance màu). If `uiux-designer`
finds a genuine gap, flag it — do not invent inline.

## i18n

Two NEW namespaces, zero collision confirmed (grepped `vi.json` +
`design-spec.jsonc` for `lessonPlan`/`questionBank` — no hits): `lessonPlan`
and `questionBank`. Do NOT touch/extend `lessonBank` or `examBank` namespaces
— these are different domains per the story's own finding.

## Design-review gate

Before marking delivered: `/impeccable audit` + `critique` on both mockups —
contrast (DRAFT/PUBLISHED badges, difficulty tiers), keyboard/focus on
builder forms, motion-safe, empty/loading/error/required-filter states, all
per `.claude/rules/accessibility.md`.

## Handoff

On delivery: hand off to `/ba` (write TR-XXX + AC against the ground-truthed
BE contract above — the story packet at
`docs/stories/epics/E18-be-wiring/US-E18.16-lesson-question-bank-wiring/story.md`
already has the contract summary staged for this) → `/fe` (implement,
new feature folders `src/features/lesson-plan` and `src/features/question-bank`,
mock-first initially since this is genuinely net-new, then real wiring
follows the epic's established remap playbook).

## Dependencies

- Depends on: none (BE contracts already exist and are stable).
- Blocks: none known.
- Shared files touched: `docs/product/design-spec.jsonc` (2 new top-level
  screen entries), `src/bootstrap/i18n/messages/{vi,en}.json` (2 new
  namespaces), `docs/product/screens.md`, `docs/design-requests/README.md`,
  `docs/design-changelog.md`. No `tokens.css`/`globals.css` edits expected.
