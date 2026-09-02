# 0073 Force-mock LMS student consumption (courses/lessons/assignments)

Date: 2026-08-08

## Status

**Superseded by 0075** (2026-09-02, US-E24.1) — ask #51 closed: `services/lms`
shipped the real course/lesson/course-item/assignment/submission contract, the
force-mock below is gone and `lms.di.ts` is back on the standard
`USE_MOCK ? Mock : Real` gate. Kept as the historical record of why the pin
existed; do NOT treat anything below as current.

Accepted (historical)

## Context

US-E18.60 ground-truths the `lms` BE service (edu-api `f5ed5a86`, live stack
smoke-test as HỌC SINH in real mode). `services/lms/docs/openapi.yaml`
declares only `/health` — every `/lms/api/v1/*` route (courses, lessons,
assignments) 404s from the `lms` service itself, not from Kong. The web's
`bootstrap/di/lms.di.ts` currently branches `USE_MOCK ? MockLmsRepository :
LmsRepository`, so in real mode the two student-facing screens built on this
DI (**Khoá học** — US-E11.6 student-lesson-player, **Bài tập** — US-E11.7
student-assignments) degrade into a permanent error card — there is no
recoverable request shape; the endpoint does not exist.

This is the same shape of gap already resolved three times in this epic:
`staff-leave.di.ts` (permanently-blocked stub), `teaching-plan.di.ts`
(force-mock, US-E18.9), and — closest precedent — `0054`
(`IGradeApprovalRepository`, grade-approval dashboard force-mocked regardless
of `USE_MOCK` because the tenant-wide rollup the screen needs doesn't exist on
the wire). LMS student consumption is the same "the whole aggregate the
screen needs is unreachable" case, just at the service-scaffold level instead
of a missing single endpoint.

## Decision

Pin `makeRepo()` in `src/bootstrap/di/lms.di.ts` to always construct
`MockLmsRepository`, **regardless of `NEXT_PUBLIC_USE_MOCK`** — mirroring
`0054`'s force-mock shape. Every use-case factory in the file
(`makeListCoursesUseCase`, `makeGetCourseLessonsUseCase`,
`makeMarkLessonCompleteUseCase`, `makeGetNoteUseCase`, `makeSaveNoteUseCase`,
`makeListQuestionsUseCase`, `makeAskQuestionUseCase`,
`makeListAssignmentsUseCase`, `makeSubmitAssignmentUseCase`) is unaffected in
signature — they still call the single `makeRepo()` seam, so the pin is
one-line-of-branch-removal, not nine repeated edits.

Removal condition: BE ships the LMS consumption contract for student
courses/lessons/assignments (cross-repo ask **#51**, filed
`docs/reports/2026-08-08-fe-to-be-asks-lms.md`) — at that point restore the
`USE_MOCK ? Mock : Real` branch (or wire real directly, per the epic's usual
un-force-mock pattern, e.g. US-E18.54's academic-records remodel).

Explicitly **out of scope**: `exam`/`exam-bank`/`lesson-bank`/`lesson-plan`/
`question-bank` — these live in separate `bootstrap/di/*.di.ts` factories that
already wire the real `core` service (US-E18.15, US-E11.8, US-E11.9) and
continue to work; this ADR only touches `lms.di.ts`'s `makeRepo()`.

## Alternatives Considered

1. **Leave real mode erroring** (status quo) — rejected: the two screens are
   part of the core student experience (courses + assignments), not an edge
   case; an unrecoverable error card for a scaffold service the team doesn't
   control the timeline of is strictly worse UX than mock data with no
   visible "demo" tell (the epic's established bar, per `0054`).
2. **Force-mock at the repository layer** (add an `if (true)` inside
   `LmsRepository` itself) — rejected: the DI factory is the established seam
   for this exact decision across the epic (`0054`, US-E18.9); duplicating
   the branch inside the repository class would split the "is this real or
   mock" answer across two files for no benefit.
3. **Delete the real `LmsRepository` implementation entirely** until BE
   ships — rejected: it is dormant, harmless groundwork for the day ask #51
   lands (matches `0054`'s choice to keep the real-mode error taxonomy
   dormant rather than delete it). **Caveat, unlike `0054`'s dormant branch:**
   `LmsRepository` has NO test of its own today (only
   `lms.mock.repository.test.ts` exists) — it is unreferenced AND untested
   after this pin, so the un-pin has zero safety net. The follow-up story that
   consumes ask #51 must add a real repo↔HTTP contract test before restoring
   the branch, not assume this dormant code is already proven.

## Consequences

- Real mode now serves the same stable mock data as `USE_MOCK=true` for these
  two student screens — no error card, no data loss (nothing was ever
  writable against the real service; mock writes were already local-only).
- `LmsRepository` (real) becomes dead code reachable only by future removal of
  this pin — left in place, not deleted (see Alternatives #3).
- Follow-up: when ask #51 ships, remove the pin in the same commit that adds
  the real endpoint wiring test, and update `docs/product/screens.md` rows for
  the two screens back to "wired real".

## Related

- `0054` (grades wiring contract remap — force-mock precedent for
  `IGradeApprovalRepository`).
- `docs/reports/2026-08-08-fe-to-be-asks-lms.md` (ask #51).
- US-E11.6, US-E11.7 (original screens this DI serves).
