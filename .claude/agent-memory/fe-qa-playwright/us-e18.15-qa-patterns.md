---
name: us-e18.15-qa-patterns
description: exam-bank real wiring QA — clean PASS gate; recipes for confidential-tone injection, opened-menu proof, and error-passthrough-through-use-case tests
metadata:
  type: project
---

US-E18.15 (LMS exam-bank real wiring, epic E18-be-wiring) — clean GO verdict,
no BLOCKER/CRITICAL/MAJOR. Patterns worth reusing:

- **"Menu trigger exists" ≠ "menu contents proven".** The engineer's
  `TeacherRealMode_AuthoringDisabled` story only asserted the dropdown
  *trigger* button was present, never opened it to check Edit/Delete were
  actually absent (vs. present-but-disabled). Recurring class of gap across
  this epic (see [[us-e13.7-qa-patterns]]) — always `userEvent.click` the
  trigger and assert on `menu.queryByRole("menuitem", ...)` via
  `within(document.body)` (Radix portals to body), don't stop at the trigger.

- **Injecting a rare enum value into a story's fixture set, without mutating
  shared fixtures.** `confidential` status only ever comes from the real wire
  (mock fixtures are permanently draft/published-only per the entity's own doc
  comment). Spread `...EXAMS, { ...EXAMS[0], id: "new-id", status: "confidential" }`
  in the story's own `args.exams` array rather than editing
  `infrastructure/repositories/mocks/fixtures.ts` (other stories/tests depend
  on that staying 2-value). Scope the assertion query to
  `el.closest('[data-slot="badge"]')` — plain text queries can double-match a
  DOM-present-but-closed Radix `Select` option carrying the same label.

- **Error-code→failure-type unit tests at the mapper layer (`map-*-error.ts`)
  are NOT the same proof as the failure reaching the use-case's typed output.**
  This epic consistently unit-tests the pure mapper function in isolation but
  skips testing that a repo `throw new Error(code)` actually flows through
  `mapRepoError` inside the use-case's catch block. Add a
  `describe("real-repo error passthrough")` block to the use-case test file:
  mock a repo method to `mockRejectedValue(new Error("invalid-transition"))`
  etc. and assert `result.failure.type`. Cheap (no new file, no mocking
  infra) and closes the actual UI-toast-relevant seam.

- **`EmptyState`'s title renders as `<p>`, not `<h1>`/`<h2>` (by design — it's
  normally a sub-region of an already-headed page).** When a component wraps
  `EmptyState` as an ENTIRE route's content (e.g. `ExamBuilderUnavailable`),
  the wrapping component must add its own sr-only `<h1>` — and a story
  asserting `getByText(<title>)` will find it TWICE (sr-only h1 + visible p).
  Use `getAllByText(...).length >= 2`, not a single `getByText`.

- Full suite: 306/1944 → 307/1950 (net +1 file/+6 tests: 4 use-case
  error-passthrough tests + 2 responsive-guard tests formatted into their own
  file). Storybook suite (`--config vitest.storybook.mts src/features/exam-bank`):
  12/13 → 14/15 (same 1 pre-existing `Builder Validation` aria-disabled
  failure, documented and out of scope — see [[us-e13.7-qa-patterns]] for the
  aria-disabled-vs-toBeDisabled root cause, same class recurring here).

- `git diff <baseline-sha>..HEAD --stat -- <out-of-scope-path>/` returning
  fully empty is the fastest, most authoritative zero-regression proof for an
  explicitly-descoped sibling feature (`src/features/exam`, student
  exam-taking) — faster than reading through the whole feature's tests.
