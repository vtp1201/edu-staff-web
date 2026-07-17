# 0056 Exam family wiring contract — real exam-papers CRUD+status, permanently-blocked class-exam assembly/lifecycle/submissions

Date: 2026-07-17

## Status

Accepted

## Context

US-E18.15 (epic `E18-be-wiring`) wires the LMS exam family to the real `core`
service. The epic table's one-line summary said: `exam-bank`→`/lms/exam-papers`
(+`/status`); `exams`→`/lms/class-exams` (+`activate/complete/submissions`) —
"lifecycle giàu hơn mock" (richer lifecycle than mock).

Ground-truthing `edu-api/services/core/docs/openapi.yaml` (`ExamBank`/
`ClassExam`/`ExamSubmission` tags, ~L3762–4400 + schemas ~L9948–10319) and the
Go source (`internal/lms/exambank/**`, `internal/lms/classexam/**`,
`internal/lms/autograde/**`) against the web's current mock model
(`src/features/exam-bank/**` — admin/teacher exam-bank builder, and
`src/features/exam/**` — student exam list/taking/result, completely
disconnected mock features with no shared identity) found the epic table's
remediation undersells the true gap on the `exams`/class-exam half, similar in
class to US-E18.4/US-E18.5/US-E18.8/US-E18.9/US-E18.14's "the table's own note
is narrower than the real gap" pattern.

## Findings

1. **`exam-bank` → `/lms/exam-papers` is a tractable, wireable remap** onto the
   EXISTING admin/teacher exam-bank screens (`exam-bank-screen`,
   `exam-builder-screen`). Real lifecycle: `DRAFT → PUBLISHED → CONFIDENTIAL`
   (terminal), vs mock's 2-value `draft`/`published`. Drift found:
   - `deleteExam` has **no wire equivalent at all** — the real API exposes no
     `DELETE` for exam papers (immutable audit lifecycle; only the `/status`
     transition endpoint mutates lifecycle state). Decision: `deleteExam`
     stays a **permanently blocked stub** in the real repository (hybrid DI,
     same class as `ClassManagementRepository.listTeachers()`) — the teacher
     exam-bank screen's delete action is hidden/disabled in real mode.
   - `teacherName`/`subjectName` (mock summary fields) have no wire
     equivalent — `ExamPaperResponse` only carries `authorId`/`subjectId`
     UUIDs. `subjectName` is resolvable via the already-real
     `subject-catalogue` listing (fan-out, same pattern as
     US-E18.4/US-E18.5). `teacherName` is **not** resolvable — 7th
     occurrence of the recurring IAM-has-no-name-lookup gap (asks
     #6/#7/#9/#13/#15/#20) — falls back to a raw-id/self-known-name
     placeholder like prior precedent, cross-repo ask logged (#21, folded
     into the existing name-lookup ask class).
   - `maxAttempts`/`difficulty` (mock-only fields on `ExamBankSummary`/
     `ExamBankQuestion`) have **zero wire representation** — same
     non-persistent-field class as E18.7's `count`/E18.11's `room`. Kept as
     local-only decorative fields, never sent/read from the wire.
   - Real question model is richer: 4 `questionType`s (`MCQ`/`ESSAY`/
     `SHORT_ANSWER`/`FILL_IN`) vs the web builder's implicit MCQ-only model
     (`correctOptionId` always present). `answerKey` requirement is
     conditional (`422 EXAM_ANSWER_KEY_NOT_ALLOWED` for non-MCQ) — the
     builder's scope stays MCQ-only for this US (no UI to author
     ESSAY/SHORT_ANSWER/FILL_IN questions exists) — logged as a follow-up
     product/design ask, not built here (no new screen, per epic directive).

2. **`exams` → `/lms/class-exams` (+ `activate/complete/submissions`) is
   NOT wireable within this epic's "no new screens" boundary — descoped
   permanently, matching the US-E18.8/US-E18.9/US-E18.14 fully-blocked
   pattern, for THREE independent, compounding reasons:**
   - **No existing UI for "publish an exam paper to a class"** (`POST
     /class-exams` needs `classId`+`subjectId`+`examPaperId`+`scheduledDate`+
     `durationMinutes` — a scheduling/assembly workflow). The web's mock
     `exam-bank` "publish" action only flips DRAFT→PUBLISHED status; it has
     never modeled per-class assignment. Building this is a **new screen**
     (teacher/admin exam-assembly + admin activate/complete/retract
     dashboard) — out of scope for a BE-wiring epic per its own "no new
     screens" directive (mirrors US-E18.14's staff-violations/
     staff-conduct-notes descope).
   - **Student self-scope `classId` discovery remains unresolved** (asks
     #9/#15/#20's premise, confirmed a 7th time): `GET /class-exams`
     requires `classId` as a mandatory query param; grepping the whole
     codebase (`resolveMyClass`/`resolve-current-class`/`myClassId`) found
     **no existing resolver** for "the logged-in STUDENT's own current
     classId" anywhere — the same gap that permanently blocked
     `timetable`'s `getChildTimetable`/`getByClass` (US-E18.11) and
     `discipline`'s student self-view (US-E18.14).
   - **Essay-question submission/grading has zero wire representation.**
     `SubmitExamAnswersRequest` only accepts MCQ answers by `position`
     (`AnswerChoiceRequest.chosenOption`); `ExamSubmissionResponse` has no
     essay-score/pending-essay concept at all (`gradingStatus` is
     `PENDING`/`GRADED`/`FAILED`, purely MCQ auto-grading, US-062). The
     mock's `ExamSummary.hasEssayQuestions`/`essayCount`/`essayMax`/
     `mcqScore` + `submitted_pending_essay` status class has **no BE
     equivalent whatsoever** — essay exams cannot be represented on the real
     contract at all today.
   - Decision: `src/features/exam` (student list/briefing/taking/result) and
     the `class-exam` half of `src/features/exam-bank` (there is no such
     half yet — it simply doesn't exist) **stay force-mocked permanently**,
     same class as `staff-leave.di.ts`/`teaching-plan.di.ts`/
     `discipline.di.ts` (US-E18.8/09/14) — unconditional mock regardless of
     `USE_MOCK`, real repository (if any is written) kept as documented
     blocked stubs mirroring the real error taxonomy for the day this
     unblocks.

## Decision

- **Wire REAL**: `IExamBankRepository` (`create`/`update`/`list`/`getDetail`/
  `publishExam`→status-transition semantics; question replace via
  `/questions`) against `/lms/exam-papers`. `deleteExam` stays a permanently
  blocked stub (real mode). MCQ-only question authoring stays the scope
  boundary (existing builder UI, no new question-type UI).
- **STAYS MOCK-FIRST PERMANENTLY**: `IExamRepository` (student
  list/questions/submit/result) — force-mocked regardless of `USE_MOCK`. The
  entire class-exam assembly/lifecycle/submissions family
  (`/lms/class-exams*`) has no wire integration in this US at all — no new
  repository, no new screen. Flagged as a product/design ask for `/uiux`+
  `/ba` (new exam-assembly + admin lifecycle + submissions-viewer screens),
  not a BE gap.
- Error taxonomy: `core` service confirmed UPPER_SNAKE (`codeFromKey`,
  consistent with US-E18.7/8/9/11/12/13) — map `ExamPaper`'s 12 `exam_paper_*`/
  `exam_status_*`/`exam_question_*`/`exam_answer_key_*` domain codes (ground-
  truthed `internal/lms/exambank/core/domain/error/exam_paper.go`) to the
  `ExamBankFailure` union; branch on `error.code`, never `message`.

## Consequences

- Admin/teacher exam-bank screens get real lifecycle (DRAFT/PUBLISHED/
  CONFIDENTIAL) + accurate error states; delete action hidden/disabled in
  real mode (small, disclosed UX change — no destructive action the real API
  doesn't support).
- Student exam-taking flow (list/briefing/taking/result) is unaffected —
  stays exactly as it is today (mock), zero behavior change, zero regression
  risk on that surface.
- Cross-repo ask #21 logged (exam-paper author display name — folds into the
  existing IAM-name-lookup ask class #6/#7/#9/#13/#15/#20).
- Product/design ask logged: exam-assembly (publish-to-class) + admin
  class-exam lifecycle (activate/complete/retract) + submissions-viewer are
  net-new screens this epic does not build; route to `/uiux`+`/ba` if/when
  prioritized.

## Related

- Decisions `0053` (assessment-scheme wiring, unit-scaling precedent),
  `0054` (grades wiring, force-mock precedent for admin-only clusters),
  `0055` (academic-records seal, force-mock precedent for viewer clusters).
- `docs/stories/epics/E18-be-wiring/US-E18.15-exam-family-wiring/story.md`.
