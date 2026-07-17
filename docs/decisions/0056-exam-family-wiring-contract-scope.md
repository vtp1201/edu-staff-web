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

## Amendment (2026-07-17, US-E18.15 implementation — write-path premise corrected)

**`openapi.yaml`'s `ExamBank` write-path documentation is itself drifted from
the real Go source and must NOT be trusted for `exam-papers` writes** — this
amendment supersedes the "wireable REAL" write-path claims in the Context/
Decision sections above. `fe-nextjs-engineer` (and fe-lead, independently
re-verified against `internal/lms/exambank/adapter/http/{routes.go,
dto/request.go,exam_paper_handler.go}`) found:

1. **`POST /exam-papers` is metadata-only** (`CreateExamPaperRequest =
   {subjectId, gradeLevel, title, durationMinutes}`) — it does NOT accept an
   inline `questions[]` array despite `openapi.yaml`'s
   `CreateExamPaperRequest` schema claiming an optional `questions` field.
2. **There is no `SetExamQuestionsRequest`/full-replace endpoint at all.**
   `openapi.yaml`'s documented `POST /exam-papers/{id}/questions` ("Replace
   question list … atomically replaces the complete question list") does not
   match the real handler: `AddQuestionRequest` is `{questionType, body,
   answerKey, marks}` — **one question per call, append-only, DRAFT-only**
   (no `positions[]`, no replace semantics, no edit/remove of an existing
   question). There is no update-question or delete-question use case
   anywhere in the Go source.
3. **The wire question shape has no `options` array.** `AddQuestionRequest`/
   `ExamQuestionResponse` carry only `{questionType, body, answerKey, marks}`
   — the web MCQ builder's 4-option-text array (`ExamBankOption[]`,
   `{id, text}`) has **no field to round-trip through on the real contract**.
   Only `answerKey` (a single string, e.g. the correct option's identifying
   text/letter) is representable.
4. **There is no update-exam-paper endpoint and no delete-exam-paper
   endpoint** — both confirmed absent from `routes.go` (only
   `POST /`, `POST /:id/questions`, `PUT /:id/status`, `GET /:id`, `GET /`
   are mounted).

### Corrected decision (Option A — maximize the genuinely wireable surface, invent nothing)

- **Wire REAL**: `listExamBank` (`GET /exam-papers`), `getExamDetail`
  (`GET /exam-papers/{id}`), `publishExam`/status-transition
  (`PUT /exam-papers/{id}/status`, DRAFT→PUBLISHED only, matching the
  existing UI action). The admin exam-bank screen is **read-only** already —
  it becomes 100% real. The teacher exam-bank **list** + **publish** action
  wire real.
- **STAYS PERMANENTLY MOCK (blocked stub, hybrid DI — same class as
  US-E18.5's `getSearchPool`/US-E18.13's blocked viewer methods)**:
  `createExam`, `updateExam`, `deleteExam` — none has a real wire equivalent
  that can carry the builder's current MCQ-with-4-options authoring model
  without inventing a contract the BE doesn't expose (per-question
  add-one-at-a-time would also lose the option-text array — Option B,
  rejected as fragile and lossy). The teacher **exam-builder screen
  (create/edit routes)** must be hidden or blocked in real mode — this is a
  **larger UI change than the original "hide delete only" scope** (an entire
  route becomes unreachable/blocked, not just one button) and MUST go
  through the design-review gate as a UI change, same rigor as any other
  screen-behavior change in this epic.
- Rejected: Option C (mock the whole feature, forfeiting the cleanly
  wireable read+publish surface) — leaves real, working, low-risk read/
  lifecycle wiring on the table for no benefit.

### Cross-repo findings (append to `EPIC-OVERVIEW.md` §Cross-repo requests, folded into existing ask numbering)

24. **(US-E18.15 amendment, 2026-07-17)** `AddQuestionRequest`/
    `ExamQuestionResponse` have no options-text array field — MCQ questions
    with >1 answer choice cannot fully round-trip through the real contract
    as currently defined. Ask: add an `options: string[]` (or similar) field
    if the product intends MCQ authoring parity with the current mock
    builder.
25. **(US-E18.15 amendment, 2026-07-17)** `services/core/docs/openapi.yaml`'s
    `ExamBank` write-path documentation (`CreateExamPaperRequest.questions`,
    `SetExamQuestionsRequest` full-replace endpoint) is drifted from the
    actual Go source/routes — the doc describes a richer contract than what
    is implemented. Ask: regenerate/reconcile `openapi.yaml` from the Go
    source for the `ExamBank` tag (BE-side doc hygiene, not a web blocker
    since we ground-truth the Go source directly per epic playbook step 1).
26. **(US-E18.15 amendment, 2026-07-17)** No update or delete endpoint
    exists for exam papers at all (not just delete, per the original
    Decision above) — if editing a DRAFT paper's metadata or discarding a
    mistaken DRAFT is a real product need, ask BE for `PATCH`/`DELETE`
    restricted to DRAFT + author-only.
