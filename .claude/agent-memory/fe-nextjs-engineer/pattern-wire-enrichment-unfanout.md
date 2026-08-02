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
4. **Audit sibling consumers by ENDPOINT URL, not by repository name.** A
   different feature/DTO/repository (`TeacherClassRepository` +
   `TeacherClassResponseDto`) hit the SAME `/core/api/v1/classes` — so its
   separate N-roster fan-out died too. Compare `*_EP` constants, then confirm the
   Go branch for that role also runs the enrichment.
5. **Un-mocking kills a doc claim in more than one file.** The force-mock
   rationale was cross-referenced from `timetable-view.di.ts` +
   `timetable-view-principal.di.test.ts` ("same remedy as principal-classes").
   Re-verify each sibling's OWN Go `authorize()` before editing: here the
   timetable one still has no MANAGER branch, so it stays force-mocked and the
   comment had to be corrected, not deleted.
