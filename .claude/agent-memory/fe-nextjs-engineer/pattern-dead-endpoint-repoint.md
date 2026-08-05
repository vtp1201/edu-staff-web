---
name: pattern-dead-endpoint-repoint
description: US-E18.40 — repointing a screen whose endpoint BE will NEVER build (cross-service source swap + per-class fan-out compose), and why a "leave the mutations alone" instruction still needs the wire body checked
metadata:
  type: project
---

US-E18.40 (principal teachers screen: dead `GET /core/api/v1/teachers` → IAM
member directory + `GET /classes/{id}/subject-assignments` compose).

**Why:** "BE won't implement it" is a different job from "BE shipped it". There
is no DTO to swap — the screen's whole data model was authored against a fantasy
endpoint, so every field must be re-justified against a DIFFERENT service's
contract.

**How to apply:**

1. **A never-implemented endpoint's entity is UNAUDITED, not just unwired.**
   `PrincipalTeacher` carried `status: ACTIVE|ON_LEAVE`, `hasConflict`,
   `classSubjectId`, `primarySubjectName` — the real sources have NONE of them
   under those semantics. Classify each field before writing code: *exists on the
   new wire* (`status` → IAM's real `ACTIVE|INACTIVE|SUSPENDED`), *DERIVABLE*
   (`primarySubjectName` = most-taught subject; say "DERIVED, not authoritative"
   in the doc comment), *composable from another endpoint* (`subjectName` via a
   catalogue drain), or *fiction → DELETE* (`hasConflict`: conflicts are a
   write-time 409, unreadable; `classSubjectId`: the row is keyed by
   `(classId, subjectId)`, the offering uuid is a different aggregate). Deleting
   beats always-`false` — a dead flag keeps dead UI (a tooltip + an i18n key)
   alive and re-invites the fiction.
2. **Changing an enum ripples through the SECOND consumer's stories.** Dropping
   `ON_LEAVE` broke `timetable-view`'s `teacher-picker` + its story's
   `getByText("Đang nghỉ phép")`. `tsc` finds the type, NOT the story's string
   assertion — grep the removed i18n VALUE too, and rewrite the "on leave stays
   selectable" comment rather than deleting the coverage.
3. **"Only touch the mutation if the id TYPE changes" misses a wrong FIELD
   NAME.** Both assign PUTs sent `{teacherId}`; core requires
   `{teacherMemberId}` (`required,uuid`) — every real-mode write would have
   422'd, invisible because the whole screen was dead. When you are in a file
   whose reads were fiction, verify the writes' bodies against the Go http dto
   even if the packet fences them off; report it instead of silently widening.
4. **Bound a per-N fan-out with a number anchored to the BE page size.** Chose
   40 = 2× core's `GET /classes` default (20, max 100), documented all three
   reasons in the exported const, and proved it with call-COUNT tests at exactly
   40 AND 41. Export the constant so the test names interpolate it and can never
   drift from the implementation.
5. **Split "authority" from "decoration" and let only the authority fail.** The
   directory decides which rows exist; class list, per-class assignments and the
   subject drain each degrade to empty independently (private `tryX()` helpers
   that never throw). Rows whose `teacherMemberId` is absent from the directory
   are DROPPED — there is no row to hang them on. Beyond the bound, homeroom
   still resolves because it comes from the list you already fetched (free
   enrichment survives a fan-out cutoff).
6. **`routedGet` beats per-call mocks for a multi-endpoint compose.** One
   `vi.fn(async url => …)` switching on the URL (with `instanceof Error → throw`)
   serves classes + N per-class + catalogue, and `get.mock.calls` then gives you
   the call-count proofs for free. It needs a `get as AxiosInstance["get"]` cast
   at the seam — axios's generic `R` won't accept a concrete `Promise<{}>`.
7. **Unresolvable name → `null` + placeholder, never the id** (again). The
   sibling `exam-bank.repository.ts` falls back to the uuid; do NOT copy that —
   add one i18n key pair instead, and assert `not.toBe(dto.subjectId)`.
8. **A dead read next door can be dead too.** `getClassSubjects()` (explicitly
   out of scope) maps a DTO no endpoint returns — the real
   `GET /classes/{id}/subjects` answers `ClassSubjectResponse` with
   `lockedFields.subjectName`, cursor-paginated. When one method of a repo was
   fiction, check its siblings' DTOs against openapi even if you must not fix
   them; report as its own story.
