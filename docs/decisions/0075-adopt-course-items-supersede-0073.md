# 0075 Adopt the real `lms` contract (course_items); supersede 0073

Date: 2026-09-02

## Status

Accepted (supersedes `0073`)

## Context

`0073` (US-E18.60, 2026-08-08) pinned `bootstrap/di/lms.di.ts` to
`MockLmsRepository` **regardless of `NEXT_PUBLIC_USE_MOCK`**, because
`services/lms` was a scaffold: `openapi.yaml` declared only `/health` and every
`/lms/api/v1/*` route 404'd from the service itself. Its removal condition was
cross-repo ask **#51**.

Ask #51 is closed. BE shipped the course/lesson/course-item/assignment/
submission surface (US-139 → US-231, ADR 0143 `course_items`), Kong routes it
(`gateway/kong/kong.yml`: route `/lms/api/v1`, `strip_path: true`, upstream
`http://lms:3004/api/v1`), and `services/lms/docs/openapi.yaml` +
`ERROR_CODES.md` document it. See
`docs/reports/2026-09-02-be-to-fe-contract-update.md` §3.

Two things about the real contract mattered more than the un-mocking itself:

1. **The path carries a DOUBLE `lms` segment.** The service mounts its routes
   under `/api/v1/lms/...`, and Kong strips only its own `/lms` prefix, so
   through the gateway the path is `/lms/api/v1/lms/...`. The mirror `LMS_EP`
   written during the mock era used `/lms/api/v1/...` — every call would have
   404'd.
2. **The FE domain model was fiction.** The mock-era model (chapters → typed
   video/pdf/text lessons with a duration label and a per-student `done` flag,
   plus per-lesson notes, per-lesson Q&A, course progress %, assignment
   score/feedback/attachment) was invented by the mock. NONE of it exists on the
   wire. What exists is: a `Course` container, ONE ordered `CourseItem`
   timeline (LESSON | ASSIGNMENT | DOCUMENT | EXAM), plain-text `Lesson`
   content, an `Assignment`, and a single-attempt `Submission` with no grade.

`0073`'s Alternatives #3 also warned that the dormant `LmsRepository` had no
test of its own, so the un-pin had "zero safety net".

## Decision

Consume the real contract, and let the UI show only what it actually carries.

1. **`LMS_EP` re-pointed** to the deployed paths, every one prefixed
   `/lms/api/v1/lms`. `courses` and `assignments` are plain constants and their
   filters (`classId`, `subjectId`, `courseId`) travel as axios `params`, so a
   caller cannot build `?classId=undefined`. `completeLesson`, `note`,
   `questions` and the student-scoped `students/{id}/assignments` are DELETED —
   BE has no such routes and (except completion) no plan to add them.
   `QUESTION_BANK_EP`, which shares the file but belongs to `core`, is
   unchanged.
2. **Domain re-derived from the contract**: `Course`/`CourseSummary`,
   `CourseItem`, `Lesson`/`LessonSummary`, `Assignment`/`AssignmentSummary`,
   `Submission`. The list projections are deliberately NARROWER than their full
   counterparts (`CourseSummary` has no `description`/`createdAt`;
   `AssignmentSummary` has no `instructions`, no `createdAt` and no `state`) —
   the by-class tables genuinely do not store them, and defaulting them would
   make "empty" indistinguishable from "never written".
3. **`state` is BE-computed** (`UPCOMING_HIDDEN | OPEN | CLOSED`) and is passed
   through verbatim; the client never derives it. A student is not sent
   `UPCOMING_HIDDEN` items EXCEPT `EXAM` tiles, which are visible before they
   start (US-231) — so that value IS reachable on a student read.
4. **The exam block is nested.** BE returns `examId`/`scheduledDate`/
   `durationMinutes`/`examUrl` FLAT and null off an EXAM row; the mapper nests
   them into `CourseItem.exam` (non-null only when `itemType === "EXAM"` AND an
   `examId` is present), so "these four belong to an exam tile" is a type-level
   fact instead of four repeated null checks in presentation.
5. **One failure union** (`LmsFailure`) replaces the old `LmsFailure` +
   `AssignmentFailure` split, mapped by UPPER_SNAKE `error.code` in
   `lms-failure.mapper.ts`. Two BE doctrines are encoded rather than flattened:
   every `*_NOT_FOUND` on a secret id collapses to `not-found` (existence
   oracle), while a denial on a caller-SUPPLIED `classId` is
   `403 LMS_CLASS_NOT_FOUND` → `forbidden`. `404 LMS_SUBMISSION_NOT_FOUND` is
   NOT a failure at all: `getMySubmission` resolves `null`, because "has not
   submitted yet" is the normal pre-submit state.
6. **`lms.di.ts` returns to the standard `USE_MOCK ? Mock : Real` gate.** The
   safety net `0073` asked for exists: `lms.repository.test.ts` is a new
   repo↔HTTP contract suite (path, request shape, code → failure), and the
   US-E18.60 DI env-matrix test is INVERTED rather than deleted.
7. **`resolveMyClassId()`** (new, `bootstrap/lib/`): both `lms` lists are
   class-scoped and `lms` publishes no self-scope discovery route, so the
   student's class is resolved from `core`'s
   `GET /members/{memberId}/enrollment` (BE US-148, self-readable by a STUDENT)
   using the `memberId` claim (`0074`). Cross-service composition lives in
   `bootstrap`, never inside a repository (decision `0017`). It fail-softs to
   `null` → a distinct `no-class` UI state, never someone else's class.
8. **The UI drops what has no source.** Deleted: the notes panel, the Q&A
   panel, the mark-complete button, the progress card, the video player, the
   PDF preview, the course progress tabs, the graded sheet, the score-tone
   helper, the four assignment status tabs, the file-attachment field, and the
   "confirm late submission" dialog. The course detail screen is now a course
   timeline plus a lazy plain-text lesson reader; the assignment list is title +
   deadline; a card's submission state is resolved when its sheet opens.

## Alternatives Considered

1. **Un-mock the DI and leave the screens as they were.** Rejected: the screens
   read `progressPct`, `gradeAvg`, `lessonsDone` and a per-row `status`, none of
   which the wire produces. Keeping them means computing them from nothing —
   the exact "default-shaped bug" class this epic keeps finding.
2. **Fan out `.../submissions/me` per row to rebuild the four status tabs.**
   Rejected: the class partition is bounded at 500 assignments, so the tabs
   would cost up to 500 requests to render one list. The submission read moved
   to sheet-open, where exactly one is needed.
3. **Derive `state` client-side from `startAt`/`dueAt`.** Rejected: BE computes
   it against its own clock and applies role-dependent filtering; a client
   re-derivation would disagree with the gate that actually rejects a submit.
   Seeded fixtures include a `CLOSED` item with a null `dueAt` precisely so a
   re-derivation cannot be reintroduced unnoticed.
4. **Mock-first the DRAFT progress endpoints now** (`courses/me`,
   `items/{id}/complete`, `courses/{id}/progress`, BE US-254) to keep the
   progress UI alive. Rejected for THIS story — it is a separate, deliberate
   convention with its own risks; see `0076`. The progress surfaces are removed
   here and return when that work is scheduled.
5. **Keep `AssignmentFailure` separate from `LmsFailure`.** Rejected: one
   service, one `error.code` namespace, one mapping table; the split predated
   the contract and duplicated members.

## Consequences

- Real mode now genuinely serves `/student/courses`, `/student/courses/[id]`
  and `/student/assignments` from `services/lms`; mock mode keeps a seed shaped
  to the same contract (all 4 item types, all 3 states) so the two modes cannot
  teach the screens different shapes.
- **The two student screens visibly lose features** (progress, grades, notes,
  Q&A, attachments, status tabs). This is the honest state of the contract, not
  a regression to fix by re-inventing them; E24.2–E24.5 redesign these screens
  against what exists, and the completion/progress family returns only if BE
  US-254 ships.
- A late submission is now REFUSED by BE (`409 LMS_ITEM_CLOSED`) rather than
  accepted-and-flagged, so the client-side "submit late?" confirmation is gone
  and the refusal is surfaced instead. This is a real behaviour change for
  students.
- `resolveMyClassId()` adds ONE `core` call to each of the two list pages. It is
  a cross-service dependency: if `core` is down, the `lms` screens show
  `no-class` even though `lms` is healthy.
- Teacher authoring commands (`createLesson`, `createAssignment`,
  `addDocumentItem`, `patchItem`, `reorderItems`) exist and are tested at the
  repository layer, but have no use-case, no DI factory and no UI — that is
  E24.10.
- `0073` is superseded; its file keeps the historical record.

## Related

- Supersedes `0073` (force-mock LMS student consumption).
- `0076` (mock-first against `openapi.draft.yaml`) — the companion convention
  for the DRAFT progress endpoints this story deliberately does not consume.
- `0074` (`memberId` claim over `sub`) — how `resolveMyClassId` identifies the
  caller. `0017` (service map / cross-service composition in `bootstrap`).
  `0018` (proactive refresh in the DI factory). `0008` (envelope).
- edu-api: `services/lms/docs/openapi.yaml`, `INTEGRATION.md`,
  `ERROR_CODES.md`, `docs/decisions/0143-course-container-course-items-and-exam-metadata-projection.md`.
- `docs/reports/2026-09-02-be-to-fe-contract-update.md` §3–§4;
  `docs/reports/2026-08-08-fe-to-be-asks-lms.md` (ask #51, now closed).
- US-E24.1; the screens it re-points: US-E11.6, US-E11.7.
