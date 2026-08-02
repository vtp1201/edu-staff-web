---
name: pattern-wire-enrichment-unfanout
description: US-E18.30 — when BE starts returning fields the client used to fan out for, the enrichment is per-ENDPOINT not per-schema; prove removal with call-count assertions
metadata:
  type: project
---

BE adds fields the FE previously derived with a 1+N / 2×N fan-out ("un-fan-out"
story). US-E18.30 (core `ClassResponse` gains `studentCount` +
`homeroomTeacherId`/`homeroomTeacherName`).

**Why:** the naive read of "the schema now has the field" is wrong and silently
blanks data on write paths.

**How to apply:**

1. **One schema ref'd by 5 endpoints ≠ 5 enriched endpoints.** Read the per-FIELD
   `description` in `openapi.yaml`, not just `required:`. Here only `GET /classes`
   and `GET /classes/{id}` enrich; `POST`/`PATCH` return `0`/`null` *by
   construction*. Cross-check in Go by grepping which use-cases call the
   enrichment helper (`enrichClassRows`) — list + get only.
   → Consequence: a mutation whose result re-renders a row must do ONE enriched
   `GET /{id}` read-back after the PATCH. Mapping the PATCH response directly
   would zero the count. Still a win (1 call vs the old 2-call fan-out).
2. **Prove removal by CALL COUNT.** `expect(get).toHaveBeenCalledTimes(1)` on a
   multi-row page. A result-only assertion passes with the fan-out still present,
   so it guards nothing — that is the whole deliverable of these stories.
3. **Two nullable fields, one authoritative.** `homeroomTeacherName` can be null
   while the id is set (independent cross-service name lookup, ADR 0124). Encode
   it in the MAPPER (`id === null ? null : name ?? id`) so presentation's
   `name ?? "chưa phân công"` can't lie. Never branch presence on the display
   field.
4. **Audit sibling consumers by ENDPOINT URL, not by repository name — grep the
   URL STRING, and do it EXHAUSTIVELY before the review does.** Round 1 fixed
   only the two repos the AC named; the tech-lead found two more hitting the same
   `/core/api/v1/classes` (`TeacherDashboardRepository` summing student counts via
   an N-roster drain, `RosterRepository` fanning out `.../homeroom-teacher` per
   row). Different feature, different DTO, same schema. Concretely:
   `grep -rn "core/api/v1/classes" src/` + grep every `*_EP` constant whose value
   contains that path (several features declare their OWN constant for the same
   URL, so grepping one constant name misses them).
   → Two extra payoffs when you sweep completely: a **stale doc comment asserting
   the OLD contract** in each missed caller (actively misleading after the wire
   changes), and sometimes a **live display bug** — the roster picker was
   rendering the raw `teacherMemberId` uuid as the GVCN's name, fixed for free by
   the enriched `homeroomTeacherName`.
   → Removing the last fan-out ORPHANS artifacts: grep the fan-out's DTO and
   endpoint constant afterwards and delete them if dead
   (`EnrollmentResponseDto`, `CLASS_EP.classStudents`).
   → Kill point-free `.map(Mapper.toX)` in the callers you touch: it passes
   `(el, index, array)`, so re-adding an optional 2nd param later silently binds
   the array index — exactly the param shape un-fan-out just deleted.
5. **Un-mocking kills a doc claim in more than one file.** The force-mock
   rationale was cross-referenced from `timetable-view.di.ts` +
   `timetable-view-principal.di.test.ts` ("same remedy as principal-classes").
   Re-verify each sibling's OWN Go `authorize()` before editing: here the
   timetable one still has no MANAGER branch, so it stays force-mocked and the
   comment had to be corrected, not deleted.
