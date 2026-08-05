---
name: pattern-stale-assertion-only-unmock
description: E18.39 — a BE-wiring "un-mock" story with ZERO production change; the deliverable is retiring stale doc/test assertions, and the honest red step is a mutation check
metadata:
  type: project
---

A BE fix can close a gap on a screen that never had a force-mock branch: the 403
was a NATURAL real error flowing through the generic repo→failure→errorVm path.
Then the whole story is "retire the stale assertions", not "swap a repository".

**Why:** US-E18.39 (`/principal/students`). BE US-175 added
`hasRole(ActorRoles, roleManager)` to core's `list_students_in_class.go`
`authorize()`. `admin-roster.di.ts` was already a plain `USE_MOCK ? Mock : Real`
gate — nothing to un-mock. What DID exist was a page doc-comment + a unit test +
TEST_MATRIX rows all asserting the MANAGER 403 as permanent-and-correct. Those
were the defect.

**How to apply:**
- Before assuming "un-mock = DI change", read the DI factory in FULL. A per-role
  403 with no special-case branch in the factory means doc/test-only. Grep the
  feature for the role token (`MANAGER`) — if the only hits are comments and test
  titles, that IS the scope.
- **Never delete the generic error coverage** when a specific cause disappears.
  A 403 state stays reachable for OTHER callers (here: a TEACHER holding no
  assignment). Retitle the test + re-document the Storybook `ForbiddenError` story
  as role-agnostic; only drop the role attribution.
- **Honest red substitute = mutation check.** With no FE behavior change, no test
  can start red. Instead prove the NEW assertion bites: temporarily replace the
  page's success return with the exact shape of the OLD failure
  (`errorVm("forbidden")` → `classes: []`, `currentClass: null`), watch it fail,
  revert, and re-grep the file to confirm restoration. Report it as a mutation
  check, not as TDD red.
- Pick the assertion the old bug's shape would break — here `vm.classes` (picker
  survived) — not just the happy-path fields an existing test already covers.
- **Stale claims outgrow the story.** The same MANAGER-403 sentence had spread to
  3 already-merged packets (E18.35, E18.11, E13.10) + the E18.35 TEST_MATRIX row.
  Fix the row you own, append a "since CLOSED by BE US-xxx, historical" clause to
  the old row, and FLAG the merged packets to fe-lead rather than rewriting them.
- Re-verify the BE claim in the local `edu-api` working copy (`git log` the Go file
  + read `authorize()`), not just the BE report — and check the role const's own
  comment, which often enumerates exactly which use cases the grant covers.

Related: [[pattern-two-gaps-one-forcemock]], [[pattern-partial-gap-closure-wiring]],
[[gotcha-openapi-drifts-from-go-source]].
