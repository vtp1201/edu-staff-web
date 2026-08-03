---
name: pattern-two-gaps-one-forcemock
description: US-E18.35 — un-mocking ONE method of a two-method force-mock (separate gaps), deriving a constant field from list semantics instead of inventing it, and the second widening of a shared tiered DTO
metadata:
  type: project
---

US-E18.35 (admin/principal class roster: core enrollments + IAM dob/gender).
Reusable lessons.

**Why:** a force-mock doc block often bundles SEVERAL independent reasons. BE
closing one of them un-mocks only part of the surface — and shipping the other
part as "real" would be a lie.

**How to apply:**

1. **Split the force-mock's reasons before you flip anything.** Here one comment
   justified `getClassRoster` + `getSearchPool` together. They were different
   gaps: "list rows carry no display fields" (closed by IAM `GET /members?ids=`)
   vs "no core endpoint exists for the unassigned pool" (NOT closed — a lookup
   BY ID cannot enumerate candidates). Flip the first, keep the second mocked,
   and rewrite BOTH doc comments so the next reader cannot re-conflate them.
   Prove the split with an env-matrix DI test that asserts the SAME factory
   serves real for one method and mock (zero HTTP) for the other in
   `["true","false",undefined]`.

2. **A missing field can be a CONSTANT derived from list semantics — but only
   after you read the delete path.** `status` had no wire source. It is
   `"active"` for every real row *because* core hard-deletes the enrollment row
   on unenroll/transfer (`RemoveStudentFromClassUseCase`, ADR 0049), so a
   departed student stops appearing. That is a verified semantic, not a guess:
   read the DELETE use-case + the openapi wording ("hard-delete"), and say so in
   the code comment and the test name. Contrast with a field that has no
   semantic backing (student CODE) — that one must stay ABSENT.

3. **Don't print an id in a slot labelled as something else.** The roster's
   "Mã học sinh" column had been showing the mock's human code; real rows only
   have a member uuid. Adding an optional `code` (absent in real mode) +
   placeholder beats "fallback to id" — a uuid under a code header is a lie, and
   under a NAME header it becomes the row's accessible name (US-E18.33 lesson).

4. **Optional-ing a required entity field: let tsc enumerate the ripple.** Making
   `name/dob/gender` optional produced exactly 7 tsc errors (mock repo pushes,
   avatar initial, aria-labels, badge prop, search filter). Each was a real
   degradation decision. Compute ONE `displayName = s.name ?? t(...)` per row and
   reuse it for the visible text, the checkbox label AND the remove-button label
   — three separate accessible names otherwise drift.

5. **A tiered field can be optional TWICE OVER.** IAM `dob`/`gender` are absent
   for a narrowed tier AND absent for a staff-tier caller who never set them
   (ADR-0122). So they can never be used as the tier signal (`email`/`roles`
   still are), and the mapper's conditional spread is required for a second,
   independent reason. Say which reason in the comment.

6. **Delete the anticipatory DTO you are replacing.** `roster-response.dto.ts` +
   `toRosterStudent` existed for an endpoint that never returned that shape; only
   its own test referenced it. Grep before assuming it is load-bearing.

7. **Date formatting at the infra boundary: slice, never `new Date()`.** A
   date-only value arriving as `...T00:00:00Z` shifts a day when formatted in
   UTC+7. Regex the `yyyy-mm-dd` prefix; an unparseable value returns `undefined`
   so presentation shows its placeholder instead of `NaN/NaN/NaN`.

8. **The Storybook suite flakes across files.** A `principal-classes-screen`
   Select story failed in the full run and passed both in isolation and on a
   clean full re-run. Re-run before believing you regressed an unrelated story
   (portal/pointer-events bleed, see `pattern-feed-and-storybook-portal-bleed`).
