---
name: pattern-fe-composed-set-difference
description: "E18.41: BE answers a missing-endpoint gap with FE-COMPOSE (directory MINUS ids) — inject both collaborators as one optional group, delete the anticipatory DTO, and un-mocking a DECORATION read creates a NEW honest-degrade surface"
metadata:
  type: project
---

US-E18.41 (`admin-roster.getSearchPool`, BE US-182 / edu-api ADR 0125): the answer
to "no endpoint enumerates unassigned students" was **not** a new list endpoint but
an ids-only helper + an explicit instruction to compose on the FE.

**Why:** BE will not ship cross-service joins; `core` owns enrollments, `iam` owns
student identities. So the FE-side pool = drained IAM `role: "STUDENT"` directory
MINUS `GET /core/api/v1/enrollments/student-ids?academicYear=` (unpaginated,
deduplicated, `[]` never null).

**How to apply** next time a gap closes this shape:

1. **One optional collaborator GROUP, not N positional params.** The repository got
   a 3rd optional ctor arg `SearchPoolSources { searchStudentDirectory,
   resolveAcademicYear }`. Absent ⇒ **fail closed** (`unknown`) with zero HTTP —
   never an empty list, which reads as "no candidates". Only the cross-feature parts
   go in the group; the repo still makes its OWN service's HTTP call itself.
2. **Failure-union translation happens ONCE**, in the repo (`fromDirectoryFailure`),
   exactly like `class-management.repository.ts`. Test it as a `.each` table so a new
   member of the foreign union can't silently fall to `unknown`.
3. **A thrown TYPED value bypasses the ApiError mapper.** `resolveCurrentAcademicYear()`
   throws `{type:"invalid-term"}`; `toRosterFailure` would label it `network-error`
   (i.e. "retry"). Branch on it explicitly before the generic mapper.
4. **Resolve the year LAZILY** (callback, not eager value) — a DI factory is
   per-request and other methods on the repo must not pay a calendar round trip.
   `resolveCurrentAcademicYear` / `resolveCurrentTermId` in
   `bootstrap/lib/resolve-current-term.ts` are the reuse points; do not re-derive
   "which year is active".
5. **A param can become a no-op — prove it, don't just comment it.** `_classId` is
   meaningless once the subtracted set is tenant-wide; the test asserts two
   different classIds yield an IDENTICAL pool. Keep the param if the mock repo still
   uses it (mock seeds are often RICHER than real data — here it also offers
   transfer candidates, which the real pool structurally cannot).
6. **Delete the anticipatory DTO + mapper**, not just the mock branch. `SearchStudentDto`
   / `toSearchStudent` / `ROSTER_EP.searchPool` all described `/students/unassigned`,
   which never existed on any server. A composed result has no wire DTO at all.
7. **Un-mocking a "decoration" read creates a NEW honest-degrade surface.** The pool
   was force-mocked, so `{ok:false}` was unreachable and an empty list was safe.
   Once real, empty-on-failure renders the panel's "no results" copy = a failed read
   dressed as "nobody left to enroll". Fix = its OWN VM key (`poolError`), rendered
   as `ListError` INSIDE the sub-panel, NOT folded into the screen's `fetchError`
   (a side panel must never blank a roster that loaded). Retry omitted for 403/401.

Related: [[pattern-unmock-anticipatory-dto]], [[pattern-two-gaps-one-forcemock]],
[[pattern-real-mode-that-was-never-real]], [[pattern-boundary-narrow-remap]].

Also observed 2026-08-05: the Storybook interaction runner WORKS again
(`bunx vitest run --config vitest.storybook.mts <file>`, and lefthook's pre-push
`test-storybook` job passes) — the older "runner broken env-wide" note is stale.
