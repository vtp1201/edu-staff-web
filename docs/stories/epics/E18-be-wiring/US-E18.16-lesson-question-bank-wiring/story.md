# US-E18.16 LMS lesson-plan + question-bank wiring — REOPENED, RE-RESOLVED (2026-07-26)

## Status

implemented

(Reopened 2026-07-26 — see `## Reopen Resolution` below. No `src/` code was
written in this reopen pass: 2 of the 3 sub-scopes were already delivered by
later stories before the reopen even started, and the 3rd sub-scope is a
genuine, non-lossless domain-model gap that must stay mock-first. All three
findings are proven by direct code read, not assumption.)

## Lane

normal

(hard-gate check: no auth/RBAC change, no token/session change, no tenant
isolation change, no data-loss risk, no PII, no validation change, no new
design-system token — because no code changes in this reopen pass.)

## Dependencies

- Depends on: none.
- Blocks: none known.
- Feature module(s) touched this pass: none (`src/` untouched — verification
  only). Docs only: this packet, `EPIC-OVERVIEW.md`, `docs/TEST_MATRIX.md`.
- Shared contract/file: none.

## Original Disposition (2026-07-17 — superseded, kept for history)

The story was originally descoped with zero code changes: ground-truthing
found the epic table's `"lessons"→"/lms/lesson-plans"` naming assumption was
false (web's only "lesson" feature, `lesson-bank`, is an unrelated
file-sharing resource repository) and that no web feature existed at all for
the BE's `exercisebank` question-bank service. Both were true statements of
web-repo state **as of 2026-07-17**. See git history of this file / EPIC
finding #27 for the full original text.

## Reopen Resolution (2026-07-26)

The premise that triggered the original descope has since changed. Re-running
the ground-truth check (BE Go source + web `src/features/*` + `bootstrap/`)
finds:

### 1. Lesson-plan — ALREADY wired real, by US-E11.8 (no action needed)

Between the original descope and this reopen, `DR-021` was authored
(`/uiux`) and **US-E11.8** (`docs/stories/epics/E11-lms-exams/US-E11.8-lesson-plan-authoring/`)
delivered a net-new "Teacher Lesson Plan Authoring" screen
(`(app)/teacher/lesson-plans*`) — the exact "teacher lesson-plan authoring"
screen this story's original disposition said would need `/uiux`→`/ba`→`/fe`
before wiring was possible. US-E11.8 did NOT stop at mock-first: it wired the
**real** `core` `lessonplan` contract directly, ground-truthed against
`edu-api/services/core/internal/lms/lessonplan/adapter/http/{routes.go,dto/*}`
(BE US-136 moved courseware off the not-yet-shipped `lms` service onto
`core`, which is why the contract is reachable at all now):

- `src/bootstrap/endpoint/lesson-plan.endpoint.ts` — `LESSON_PLAN_EP` maps to
  `/core/api/v1/lms/lesson-plans` (+`/publish`, `/subject/:id`), Kong-stripped
  per ADR `0030`.
- `src/features/lesson-plan/infrastructure/repositories/lesson-plan.repository.ts`
  — real `LessonPlanRepository`: `create`/`listMine`/`listBySubject`/`get`/
  `update`/`publish`, `{ raw: true }` top-level sibling of `params` (not
  nested — the US-E18.2/US-E18.19 regression class), `parseEnvelope()` for
  pagination.
- `src/features/lesson-plan/infrastructure/repositories/map-lesson-plan-error.ts`
  — all 13 failure types, error codes VERIFIED against `core`'s
  `codeFromKey = strings.ToUpper(key)` (`pkg/kit/response/error.go:108`).
- `src/bootstrap/di/lesson-plan.di.ts` — `makeRepo()` branches on `USE_MOCK`;
  the real branch calls `ensureFreshSession()` BEFORE
  `createServerHttpClient()` (playbook step 6 — present and correct).
- 113 unit tests (per US-E11.8's own TEST_MATRIX entry) + reviewer/a11y/
  design-review/QA gates already passed and merged
  (`3ee8fe0 chore(lesson-plan): merge feat/us-e11.8-lesson-plan-authoring`).

**Nothing left to wire.** This sub-scope of US-E18.16 is complete via
US-E11.8, confirmed by direct code read this session — not by re-doing the
work.

### 2. Question-bank — ALREADY wired real, by US-E11.9 (no action needed)

Same story: **US-E11.9** (`docs/stories/epics/E11-lms-exams/US-E11.9-question-bank/`,
if present, or the E11 epic's question-bank entry) delivered the net-new
"teacher question bank" screen (`(app)/teacher/question-bank*`) this story's
original disposition said would need net-new design work — and wired it real
against `core`'s `exercisebank` sub-domain from the start:

- `src/bootstrap/endpoint/lms.endpoint.ts` — `QUESTION_BANK_EP` maps to
  `/core/api/v1/lms/questions` (+`/search`, `/:id`, `/:id/publish`),
  explicitly commented as real + explicitly distinguished from the unrelated
  `LMS_EP.questions` per-lesson Q&A thread.
- `src/features/question-bank/infrastructure/repositories/question-bank.repository.ts`
  — real `QuestionBankRepository`, same `{raw:true}`-top-level +
  `parseEnvelope()` pattern, per-method `callSite` disambiguation for the
  `forbidden-browse` vs `forbidden-edit` 403 split.
- `src/bootstrap/di/question-bank.di.ts` — same `USE_MOCK` branch +
  `ensureFreshSession()` pattern as lesson-plan.
- Merged: `7201eee chore(question-bank): merge feat/us-e11.9-question-bank
  (US-E11.9)`, full TDD/review/a11y/design-review/QA gate history in its own
  packet.

**Nothing left to wire.** Confirmed by direct code read this session.

### 3. Exam (`exam.endpoint.ts` remap) — genuine modeling gap, STAYS MOCK-FIRST

This sub-scope was added at reopen time (US-E18.15 wired the exam-BANK —
`exam-papers`, MCQ question authoring — but explicitly did not touch the
`exam` feature, the student-facing exam-TAKING screen still pointed at the
never-shipped `/lms/api/v1/exams`). Ground-truthing `core`'s `ClassExam` /
`ExamSubmission` contract
(`edu-api/services/core/docs/openapi.yaml` lines ~3944-4295, ~10159-10340)
against `src/features/exam/**` finds this is **not** a path/DTO drift like
every prior US in this epic — it is a genuine, non-lossless domain-model
mismatch on three independent axes:

1. **MCQ-only vs mixed MCQ+essay.** The web `exam` feature explicitly models
   mixed exams: `ExamResultStatus = "completed" | "submitted_pending_essay"`,
   `ExamQuestion.type = "mcq" | "essay"`, `SubmitAnswer` discriminated union
   with a free-text `essay` branch, `ExamResult.essayMax`/`essayCount` and a
   nullable `score`/`passed` while essay grading is pending — formalized in
   **ADR `0048`** ("ExamResult nullable score and passed for
   submitted_pending_essay status", written for US-E11.5, explicitly targeting
   the not-yet-shipped `lms` service, decision `0014`). `core`'s
   `ExamSubmissionResponse`/`SubmitExamAnswersRequest` are MCQ-only by design
   (`AnswerChoiceRequest{position, chosenOption}`, `scoreRaw`/
   `scorePercentage` computed purely from the frozen `examSnapshot`'s MCQ
   `answerKey`s — the endpoint docs say so explicitly: "MCQ auto-grading...
   MCQ `answerKey` fields only"). There is no essay submission, no manual
   teacher-grading endpoint, no partial/pending score concept on the wire at
   all. Remapping would silently drop the entire essay half of the feature
   ADR `0048` exists to support — not acceptable without a product decision.
2. **No `classId` in the web model at all vs. `classId` being load-bearing on
   every real endpoint.** `ExamSummary`/`SubmitExamInput`/`IExamRepository`
   have no `classId` field anywhere. The real `GET /class-exams` REQUIRES a
   `classId` query param (list is per-class, not per-student — a STUDENT sees
   only their own enrolled class's ACTIVE exams, filtered server-side by
   enrollment) and `POST .../submissions` requires `termId` +
   `academicYearLabel` + `columnId` (to route the auto-graded score into a
   specific `AssessmentScheme` grade column) — none of which the web's
   `listExams(studentId)` / `submitExam(SubmitExamInput)` signatures carry or
   could obtain without a wider redesign (same class of gap as US-E18.11's
   `linked-students` no-`classId` finding, ask #15, and US-E18.14's
   `classId`-on-student-self-view finding).
3. **Deadline/expiry model vs. admin-driven workflow-state model.** Web
   status is derived from a client-visible `deadline` timestamp
   (`available`/`completed`/`expired`). `ClassExam.status` is
   `SCHEDULED | ACTIVE | COMPLETED | RETRACTED`, transitioned explicitly by an
   ADMIN action (`PUT .../activate`, `PUT .../complete`) or a system
   scheduler — there is no wire-level "deadline" field at all, only
   `scheduledDate` (the activation instant) + `durationMinutes`. An "expired"
   web state has no real counterpart; a real ACTIVE exam stays ACTIVE until
   an admin explicitly completes it.

This matches this epic's established precedent for a genuine, non-lossless
modeling gap (US-E18.9 teaching-plan composite-key/period-axis finding #14,
US-E18.11 self-view finding #15, the original US-E18.16 lesson-bank finding
#27): **`exam.endpoint.ts` and `src/features/exam/**` are left untouched,
mock-first, as they already were.** Remapping this feature to `core`'s
`ClassExam`/`ExamSubmission` contract is a product/design decision (does the
mixed-MCQ+essay UX get cut down to MCQ-only to match the real contract, or
does the real contract need a BE follow-up for essay support + a
student-facing "my classes" list to resolve `classId`?) — not something `fe`
can resolve unilaterally by picking a lossy mapping.

## Design Notes

None — no UI touched, no code touched.

## Validation

No code, no test changes in this reopen pass. Re-ran the full suite for
sanity (delta is zero — confirms nothing regressed while establishing this
finding):

| Layer | Expected proof |
| --- | --- |
| Unit | n/a — no code this pass (lesson-plan/question-bank unit proof lives in US-E11.8/US-E11.9's own TEST_MATRIX rows) |
| Integration | n/a — no code this pass |
| E2E | n/a — no code this pass |
| Platform | `bunx vitest run` → 420 files / 2843 tests, all pass. `NEXT_PUBLIC_USE_MOCK= bun run build` → green. |
| Release | Epic table + finding registered, `EPIC-OVERVIEW.md` + `TEST_MATRIX.md` updated, Harness story flipped to `implemented` (the epic's intent for this US — "wire what's wireable, document what genuinely can't be" — is satisfied: 2/3 sub-scopes are real, 1/3 has a documented, justified mock-first hold). |

## Harness Delta

- `EPIC-OVERVIEW.md`: Wave-3 table row for US-E18.16 updated to reflect the
  reopen resolution; appended finding #38 (this reopen's outcome, follow-up
  to reopen note #37).
- `docs/TEST_MATRIX.md`: US-E18.16 row updated `planned`→`implemented`
  reflecting the corrected disposition (2 sub-scopes done via sibling US's,
  1 sub-scope genuinely and permanently mock-first).
- Harness story `US-E18.16` updated `--status implemented` (see below for the
  exact flags used and why).

## Evidence

- Ground-truth reads (BE): `edu-api/services/core/docs/openapi.yaml` lines
  ~3944-4295 (`ClassExam`/`ExamSubmission` paths) + ~10159-10340
  (`ClassExamResponse`/`SubmitExamAnswersRequest`/`ExamSubmissionResponse`
  schemas).
- Ground-truth reads (web, this session): `src/features/lesson-plan/**`
  (repository/DI/error-map — confirmed real, not mock), `src/features/
  question-bank/**` (same), `src/features/exam/**` (entity/repository/DI/
  mock fixtures — confirmed mock, confirmed `ADR 0048`'s essay model, confirmed
  no `classId` anywhere), `src/bootstrap/endpoint/{lesson-plan,lms,exam}.endpoint.ts`,
  `docs/decisions/0048-exam-result-nullable-score-for-pending-essay.md`.
- `git log` confirming US-E11.8 (`3ee8fe0`) and US-E11.9 (`7201eee`) merges
  predate this reopen and already include the real repository/DI wiring
  (not just the screens).
- `bunx vitest run`: 420 files / 2843 tests pass (baseline unchanged — no
  source touched this pass).
- `NEXT_PUBLIC_USE_MOCK= bun run build`: green, unchanged (includes
  `/teacher/lesson-plans*` and `/teacher/question-bank*` routes already in
  the route manifest from US-E11.8/US-E11.9).

Not merge-owner-blocking — `fe-lead` closes this story directly (docs-only
this pass, no `src/` diff to review/audit/gate).
