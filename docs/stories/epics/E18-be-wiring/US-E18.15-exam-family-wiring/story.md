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
  delete-hidden-in-real-mode), `src/bootstrap/di/exam-bank.di.ts` (+
  `ensureFreshSession`), `src/bootstrap/endpoint/exam-bank.endpoint.ts` (full
  remap to `/lms/exam-papers`). `src/features/exam/**` (student exam-taking)
  is explicitly OUT OF SCOPE — stays mock, zero change.
- Shared contract/file: `messages/{vi,en}.json` `examBank.*` namespace —
  reuse existing keys, add only genuinely new ones (CONFIDENTIAL status
  label if surfaced, new error codes). Solo mode confirmed via
  `git fetch --prune` (remote has only `origin/main`).

## Product Contract — ground-truthed against `edu-api`

Full analysis in ADR `0056`. Summary:

### Wireable REAL: `IExamBankRepository` → `/api/v1/lms/exam-papers`

| Operation | Method + path | Actor |
| --- | --- | --- |
| Create paper (DRAFT) | `POST /lms/exam-papers` | TEACHER |
| List papers (role-filtered) | `GET /lms/exam-papers?subjectId&grade&status&cursor&limit` | ADMIN (all) / TEACHER-author (any status) / TEACHER-other (PUBLISHED only, own subjects) |
| Get one (auth-filtered) | `GET /lms/exam-papers/{id}` | DRAFT=author-only(404 else); PUBLISHED=author/assigned-teacher/ADMIN(answerKey-stripped for non-author); CONFIDENTIAL=ADMIN-only(404 else) |
| Replace questions | `POST /lms/exam-papers/{id}/questions` | author only, DRAFT/PUBLISHED (not CONFIDENTIAL) |
| Status transition | `PUT /lms/exam-papers/{id}/status` | DRAFT→PUBLISHED (author); PUBLISHED→CONFIDENTIAL (author/ADMIN); terminal |
| Delete | **no wire endpoint** | permanently blocked stub — hide/disable in UI (real mode) |

`totalMarks` is server-computed (sum of question `marks`) — never sent by
the client; the local builder's own running total becomes display-only in
real mode (still useful for the author while composing, but not authoritative
until the server responds).

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

No new screen (per ADR 0056's scope cut). Existing `exam-bank-screen` +
`exam-builder-screen` get:
- 3-value status (`DRAFT`/`PUBLISHED`/`CONFIDENTIAL`) — status never
  color-only (icon+label per `accessibility.md`); reuse `StatusBadge`
  pattern, no new token.
- Delete action hidden/disabled when running in real mode (no wire
  endpoint) — must not silently fail; either remove the affordance or show a
  clear disabled state with an explanatory tooltip/label (a11y: not a bare
  `disabled` button with no explanation).
  `teacherName` fallback to a raw-id-derived placeholder (documented,
  consistent with prior IAM-name-gap precedent) is acceptable, not a
  blocking a11y/design issue by itself.

## Cross-repo findings (append to `EPIC-OVERVIEW.md` §Cross-repo requests)

21. **(US-E18.15, 2026-07-17) [confirms #6/#7/#9/#13/#15/#20's premise a 7th
    time]** `ExamPaperResponse` carries only `authorId` (UUID) — no author
    display name. Same recurring IAM-name-lookup gap.
22. **(US-E18.15, 2026-07-17)** No `DELETE` exists for exam papers (immutable
    audit lifecycle by design) — if a genuine "discard a mistaken DRAFT"
    product need exists, ask BE for a `DELETE` restricted to `DRAFT` +
    author-only, or accept CONFIDENTIAL-style soft-retirement via a new
    terminal status.
23. **(US-E18.15, 2026-07-17)** No `POST /lms/class-exams` UI exists anywhere
    in the web app — publishing an exam paper to a class, admin
    activate/complete/retract, and the submissions viewer are net-new
    screens with zero prior design/BA work. Route to `/uiux` + `/ba` if this
    becomes a real product priority — not a BE gap, BE already ships the
    full contract (`ExamBank`/`ClassExam`/`ExamSubmission`, US-054/055/062).

## Design Source

No new screen. Existing `exam-bank-screen`/`exam-builder-screen` keep their
layout; only the status badge (3-value) and delete-affordance change.
