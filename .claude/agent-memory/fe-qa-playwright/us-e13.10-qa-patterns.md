---
name: us-e13.10-qa-patterns
description: principal students roster (read-only reuse) QA patterns — discriminated-union compile-probe technique, DI factory mock-delegation reading, clean-PASS baseline
metadata:
  type: project
---

US-E13.10 (principal read-only roster, reuse of admin-roster's RosterTable/RosterBreadcrumb/ClassInfoCard via a
new `readOnly` discriminated union + a new thin `PrincipalRosterScreen`) — rare fully-accurate self-report, PASS
with only a stale `TEST_MATRIX.md` row as a MINOR finding.

**Discriminated-union compile-time proof technique**: to verify a "handlers required exactly when readOnly=false"
union genuinely rejects invalid call shapes (not just documented intent), write a throwaway probe `.tsx` file
inside `src/` with two `@ts-expect-error` directives (one on a non-readOnly caller missing handlers, one on a
readOnly caller passing a handler), run `bunx tsc --noEmit`, then delete the probe. If `tsc` stays clean, both
directives caught a real error (an *unused* `@ts-expect-error` itself fails tsc) — this is much stronger proof
than reading the type definition and trusting TS narrowing works as intended.

**DI-factory mock/real split verification**: when a packet claims "method X is real, method Y stays permanently
mock for all callers", don't trust the docblock — read the actual DI factory (`bootstrap/di/<feature>.di.ts`)
for the unconditional rebind (e.g. `getClassRoster = mock.getClassRoster.bind(mock)` outside any `if (USE_MOCK)`
branch) AND the repository's own stub-method comment/return value. Both must agree.

**Two-distinct-empty-states pattern** (no-classes-in-school vs empty-roster-for-this-class): confirm both are
independently reachable via separate VM shapes (`currentClass: null` vs `currentClass` set + `roster: []`) and
render genuinely different copy/i18n keys, not the same EmptyState with different text passed as a prop that
could silently collapse to one path.

Reusable checks for any "add readOnly variant to an existing mutation-heavy component" story: (1) confirm the
existing mutating caller's call site still compiles unchanged (grep it, read the props passed), (2) confirm the
new caller's zero-mutation claim via DOM-string-absence tests, not just "the prop defaults to false", (3) check
the shared RBAC-gating layout already covers the new route (no new guard code needed) by reading the layout file.
