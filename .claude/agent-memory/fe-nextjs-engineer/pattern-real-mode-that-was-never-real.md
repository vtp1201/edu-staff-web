---
name: pattern-real-mode-that-was-never-real
description: E18.42/E18.43 — a plain USE_MOCK DI gate does NOT mean a method was really wired; mock-era DTOs make real mode silently produce undefined, a path-scoped endpoint must reject a key-less caller with zero HTTP, and a nullable wire timestamp needs entity widening + a render guard
metadata:
  type: project
---

Two BE-wiring stories where "already real" and "no endpoint" were both wrong.

## A plain `USE_MOCK ? Mock : Real` gate is NOT evidence of a working real path
US-E18.42: `assessment-scheme.di.ts` was never a force-mock, so real mode HAD been
calling `GET /subjects` — yet the endpoint comment said "still mock-first" and the
DTO (`{id, name, gradeLevel, requiredAssessmentCount}`) was a shape **no endpoint
ever emitted** (real: `subjectId` + nested `master.requiredExamCount`). Real mode
was producing `id: undefined` for every row and no test could see it, because the
fixture matched the invented type. See [[pattern-unmock-anticipatory-dto]].

**Why:** un-mock stories get triaged by "is the DI force-mocked?" — that question
misses the case where the wiring exists but the CONTRACT was guessed.
**How to apply:** when a story says "already calls the endpoint", diff the DTO
against the Go response struct / another feature that reads the SAME endpoint
before believing anything. A sibling feature reading the same path is the cheapest
ground truth (subject-catalogue's `SubjectResponseDto` had it right all along).

## "Filter applied before pagination" ≠ one page
Each PAGE is fully matching; a grade can still span pages. Reuse the sibling's
drain loop (`params: {...cursor}` + top-level `raw: true`, while
`pagination.hasMore && pagination.nextCursor`) rather than inventing a second one,
and make the endpoint constant path-only so filters/cursor travel as axios params
(a query-string-baked constant blocks draining).

## A shared validation code needs the blamed FIELD, not just the code
`core`'s `VALIDATION_FAILED` is emitted by every write path. Mapping it blindly to
"bad grade level" would mislabel a `letterGrades` rejection. Gate on
`error.fields[]` containing the param name; prove BOTH directions (positive + a
negative "not misattributed" test).

## A path-scoped endpoint + a key-less caller = honest failure, zero HTTP
US-E18.43: the screen calls `listSealedStudents()` with no filter (the mock served
tenant-wide); the real endpoint is `/classes/{id}/terms/{id}/...`. Returning `[]`
would fake an empty picker. Return a failure and assert `expect(get).not
.toHaveBeenCalled()`. Then document the caller-side scoping as an explicit
out-of-scope follow-up instead of silently "fixing" the UI.

**Why:** silent-empty is the defect class this repo keeps catching in review.

## A nullable wire timestamp is a UI bug, not just a type widening
`sealedAt: string | null` → `new Date(null)`/`new Date("")` renders `Invalid Date`
through `useFormatter`. Widen the entity, guard the render (`student?.sealedAt &&`)
so the hint DISAPPEARS, and keep the row selectable — dropping the row would hide
an actionable item. Also assert the mapper's exact key set so newly-available wire
fields you chose NOT to surface (`sealedBy`, `resealCount`) can't leak in later
without a decision.

## Doc-comment counts are load-bearing state
"FIVE methods are real / FOUR delegate to mock" appears in the repo class, the
hybrid facade, the DI factory, the endpoint header AND the test-file header. Grep
the count words when a method changes sides — a stale count is how the NEXT story
gets mis-triaged (that's exactly what happened to E18.42). Also record when a gap
is *unimplementable* rather than un-shipped (no multi-cycle seal event log ⇒
`getSealAuditTrail` can never be real) so it stops being re-asked.
