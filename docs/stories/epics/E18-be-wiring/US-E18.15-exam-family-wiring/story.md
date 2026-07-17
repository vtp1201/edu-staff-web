# US-E18.15 LMS exam family wiring — real exam-papers CRUD+status, permanently-blocked class-exam assembly/lifecycle/submissions

## Status

planned

## Lane

normal

(hard-gate check: no auth/RBAC change beyond existing tiered-visibility
pattern already handled throughout the epic; no token/session change; no
tenant-isolation change; no data-loss risk — removing a delete action the
real BE never supported is a disclosed scope cut, not a data-loss risk; no
new PII; no weakening validation; no new design-system token. See
`docs/decisions/0056-exam-family-wiring-contract-scope.md`.)

## Dependencies

- Depends on: US-E18.3 (subject-catalogue — real, provides the `subjectName`
  fan-out join for exam-paper summaries), US-E18.11/US-E18.12 (precedent for
  `ensureFreshSession` DI wiring + hybrid permanently-blocked-method pattern).
- Blocks: none known.
- Feature module(s) chạm: `src/features/exam-bank/**` (domain
  entities/failures/use-cases untouched where possible, infra dtos/mappers/
  repository remapped, presentation gets real-lifecycle status affordance +
  **teacher builder route (create/edit) + delete hidden/blocked in real
  mode — see Amendment below, this is a bigger UI change than originally
  scoped and needs design-review sign-off**), `src/bootstrap/di/exam-bank.di.ts`
  (+ `ensureFreshSession`), `src/bootstrap/endpoint/exam-bank.endpoint.ts`
  (full remap to `/lms/exam-papers`). `src/features/exam/**` (student
  exam-taking) is explicitly OUT OF SCOPE — stays mock, zero change.
- Shared contract/file: `messages/{vi,en}.json` `examBank.*` namespace —
  reuse existing keys, add only genuinely new ones (CONFIDENTIAL status
  label if surfaced, new error codes). Solo mode confirmed via
  `git fetch --prune` (remote has only `origin/main`).

## Product Contract — ground-truthed against `edu-api`

Full analysis in ADR `0056` **+ its 2026-07-17 Amendment — READ THE AMENDMENT
FIRST, it supersedes the write-path table originally drafted below** (the
`openapi.yaml` write-path docs are themselves drifted from the real Go
source; ground-truth is `internal/lms/exambank/adapter/http/{routes.go,
dto/request.go,exam_paper_handler.go}`). Corrected summary (Option A):

### Wireable REAL: `IExamBankRepository` → `/api/v1/lms/exam-papers`

| Operation | Method + path | Actor | Notes |
| --- | --- | --- | --- |
| List papers (role-filtered) | `GET /lms/exam-papers?subjectId&gradeLevel&status&cursor&limit` | ADMIN (all) / TEACHER-author (any status) / TEACHER-other (PUBLISHED only, own subjects) | query key is **`gradeLevel`**, not `grade` |
| Get one (auth-filtered) | `GET /lms/exam-papers/{id}` | DRAFT=author-only(404 else); PUBLISHED=author/assigned-teacher/ADMIN(answerKey-stripped for non-author); CONFIDENTIAL=ADMIN-only(404 else) | |
| Status transition | `PUT /lms/exam-papers/{id}/status` | DRAFT→PUBLISHED (author); PUBLISHED→CONFIDENTIAL (author/ADMIN); terminal | maps to the existing `publishExam` UI action, DRAFT→PUBLISHED only |

### PERMANENTLY BLOCKED STUBS in real mode (hybrid DI, same class as US-E18.5/US-E18.13)

| Operation | Why blocked |
| --- | --- |
| `createExam` | Real `POST /lms/exam-papers` is metadata-only (`{subjectId,gradeLevel,title,durationMinutes}`) — no inline `questions[]`. Real `POST /:id/questions` is add-ONE-question, DRAFT-only, append-only (no full-replace) and has **no options-text array field** — the builder's 4-option MCQ authoring model cannot round-trip. |
| `updateExam` | No update-exam-paper endpoint exists at all. |
| `deleteExam` | No delete-exam-paper endpoint exists at all. |

**Consequence for the teacher exam-builder screen (create + `[id]/edit`
routes)**: since none of create/update/delete are wireable, the entire
builder must be hidden or blocked in real mode (`!USE_MOCK`) — not just the
delete button. This is a **larger UI-behavior change than originally scoped**
and needs explicit design-review sign-off (see Amendment in ADR 0056). The
**admin exam-bank screen is read-only already** (list + get only) so it
becomes 100% real with no UI change beyond the 3-value status badge. The
**teacher exam-bank list + publish action** wire real; the **teacher builder
(create/edit)** stays mock-first permanently and its route should present a
clear "not available" state in real mode rather than a broken/erroring form.

`totalMarks` is server-computed (sum of question `marks`) on the wire — not
relevant to the builder now that create/update are blocked in real mode; the
mock builder path is unaffected.

**Known trap to fix while wiring**: the existing client-side
`validateQuestionsForPublish` (`domain/use-cases/validate-questions.ts`)
requires `options.length >= 2` per question — this will incorrectly fail
`PublishExamUseCase` against REAL exam papers read back from the wire (which
never have an `options` array). Either scope this validation to the mock
path only, or make it tolerant of a missing/empty `options` array when the
question came from a real read (real questions were already validated
server-side at write time, and there is no write path to re-validate here).

### Error taxonomy (ground-truthed `internal/lms/exambank/core/domain/error/exam_paper.go`, UPPER_SNAKE confirmed same as US-E18.7/8/9/11/12/13)

| Failure type | HTTP | Code |
| --- | --- | --- |
| `not-found` | 404 | `EXAM_PAPER_NOT_FOUND`, `EXAM_PAPER_SUBJECT_NOT_FOUND` |
| `forbidden` | 403 | `EXAM_PAPER_FORBIDDEN` |
| `not-draft` (invalid-for-edit) | 409 | `EXAM_STATUS_INVALID_FOR_EDIT` |
| `invalid-transition` | 409 | `EXAM_STATUS_TRANSITION_INVALID` |
| `question-body-required` | 422 | `EXAM_QUESTION_BODY_REQUIRED` |
| `question-marks-invalid` | 422 | `EXAM_QUESTION_MARKS_INVALID` |
| `answer-key-required` | 422 | `EXAM_ANSWER_KEY_REQUIRED_FOR_MCQ` |
| `answer-key-not-allowed` | 422 | `EXAM_ANSWER_KEY_NOT_ALLOWED` |
| `title-required` | 422 | `EXAM_PAPER_TITLE_REQUIRED` |
| `title-too-long` | 422 | `EXAM_PAPER_TITLE_TOO_LONG` |
| `duration-invalid` | 422 | `EXAM_PAPER_DURATION_INVALID` |
| `invalid-cursor` | 400 | `EXAM_PAPER_INVALID_CURSOR` |
| `network-error` | ≥500/transport | — |
| `unknown` | fallback | — |

### STAYS MOCK-FIRST PERMANENTLY (out of scope, per ADR 0056)

- `IExamRepository` (`src/features/exam` — student list/questions/submit/
  result) — force-mocked regardless of `USE_MOCK`. No new repository, no new
  screen. The entire `/lms/class-exams*` family (publish-to-class, admin
  activate/complete/retract, submissions) has no wire integration here:
  no existing "publish exam to class" UI (new-screen boundary), no
  self-scope `classId` resolver for STUDENT (asks #9/#15/#20's premise, 7th
  confirmation), and essay-question submission has zero wire representation
  (`SubmitExamAnswersRequest` is MCQ-only by `position`).

## Design Notes (existing screens only — design-review + a11y gate applies)

No new screen (per ADR 0056's scope cut) — but a **bigger UI-behavior
change than the original "hide delete only" scope**, per the Amendment:
- 3-value status (`DRAFT`/`PUBLISHED`/`CONFIDENTIAL`) — status never
  color-only (icon+label per `accessibility.md`); reuse `StatusBadge`
  pattern, no new token.
- Teacher exam-bank list: "Create" action + the builder routes
  (`teacher/exam-bank/create`, `teacher/exam-bank/[id]/edit`) are
  hidden/blocked in real mode (no wire path for create/update/delete) —
  must not silently 404 or show a broken form; present a clear, translated
  "not available yet" state. Delete action hidden/disabled for the same
  reason — not a bare `disabled` button with no explanation.
  `teacherName` fallback to a raw-id-derived placeholder (documented,
  consistent with prior IAM-name-gap precedent) is acceptable, not a
  blocking a11y/design issue by itself.
- This is UI-behavior scope creep vs the original story framing (an entire
  route becomes unreachable in real mode, not just one button) — flagged
  explicitly for the design-review gate, not silently shipped.

## Cross-repo findings (appended to `EPIC-OVERVIEW.md` §Cross-repo requests as #23–26)

23. **(US-E18.15, 2026-07-17) [confirms #6/#7/#9/#13/#15/#18/#20/#21/#22's
    premise a 10th time]** `ExamPaperResponse` carries only `authorId` (UUID)
    — no author display name. Same recurring IAM-name-lookup gap.
24. **(US-E18.15, 2026-07-17)** `AddQuestionRequest`/`ExamQuestionResponse`
    have no options-text array field — MCQ questions with >1 answer choice
    cannot fully round-trip through the real contract as currently defined.
    Ask: add an `options: string[]` (or similar) field if MCQ-authoring
    parity with the current mock builder is a real product need.
25. **(US-E18.15, 2026-07-17)** `services/core/docs/openapi.yaml`'s
    `ExamBank` write-path documentation (`CreateExamPaperRequest.questions`,
    a `SetExamQuestionsRequest` full-replace endpoint) is drifted from the
    actual Go source/routes — the doc describes a richer contract than what
    is implemented (real: metadata-only create; add-one-question,
    DRAFT-only, append-only). BE-side doc-hygiene ask, not a web blocker
    since the epic playbook ground-truths the Go source directly.
26. **(US-E18.15, 2026-07-17)** No update or delete endpoint exists for exam
    papers at all — if editing a DRAFT paper's metadata or discarding a
    mistaken DRAFT is a real product need, ask BE for `PATCH`/`DELETE`
    restricted to DRAFT + author-only. Separately: no `POST /lms/class-exams`
    UI exists anywhere in the web app — publishing an exam paper to a class,
    admin activate/complete/retract, and the submissions viewer are net-new
    screens with zero prior design/BA work. Route to `/uiux` + `/ba` if this
    becomes a real product priority — not a BE gap, BE already ships the
    full contract (`ExamBank`/`ClassExam`/`ExamSubmission`, US-054/055/062).

## Design Source

No new screen. Existing `exam-bank-screen`/`exam-builder-screen` keep their
layout; only the status badge (3-value) and delete-affordance change.
