---
name: pattern-import-allowlist-and-success-live-region
description: E18.59 fix round — a "makes no HTTP call" static test guard must be an exact-match import ALLOWLIST (denylist + fetch spy both miss axios); and a loading→success transition needs a persistent sr-only role=status region, not just the failure role=alert
metadata:
  type: feedback
---

Two reusable results from the US-E18.59 review fix round.

**1. Static "this module makes no network call" guards must be allowlists.**
A denylist (`expect(source).not.toMatch(/bootstrap\/di/)` …) plus a runtime
`globalThis.fetch` spy is NOT sufficient: axios in node does not go through
`globalThis.fetch`, and `import axios from "axios"` matches no denylist pattern —
a real `axios.post(...)` left the file 10/10 green. Fix: parse EVERY module
specifier out of the source (`from "x"`, bare `import "x"`, `import("x")`,
`require("x")`), sort + dedupe, and `toEqual` an explicit list. Keep the runtime
test alongside it.
**Why:** the guard is the story's primary invariant; a guard that cannot fail on
a real regression is decoration.
**How to apply:** any test whose point is "this file imports nothing dangerous".
Prove it with a mutation probe, and use a SILENT variant (`try { await
axios.post(...) } catch {}`) — a crashing probe fails every test for the wrong
reason and hides whether the guard itself caught anything.

**2. Failure states announce for free; success states do not.**
`role="alert"` (e.g. a notice component) announces on insertion, so every error
branch is covered by accident. A `loading → content` swap announces NOTHING: the
skeleton's own `role="status"` merely unmounts (removal is never announced) and
the content is a silent DOM insertion. Fix: one persistent, initially-EMPTY
sr-only `role="status" aria-live="polite"` span rendered OUTSIDE the branch
switch, filled by a `useEffect` keyed on the success condition.
**Why:** WCAG 4.1.3; screen readers announce text changes inside a region that
already existed, not a region inserted with its text.
**How to apply:** any async surface with a skeleton. Gotchas: (a) two
`role="status"` nodes now coexist while pending → existing stories using
`getByRole("status")` break; select the busy one via
`getAllByRole("status").find(el => el.getAttribute("aria-busy") === "true")`
(annotate `(el: HTMLElement)` or tsc infers `any`); (b) the announcement lands
one effect-commit AFTER the content paints — assert it inside `waitFor`, else
flaky/red; (c) give the span a `data-testid` so stories can assert the SAME node
survived the swap (`toBe`).
Related: [[gotcha-terminal-error-vs-skeleton]], [[pattern-seed-resync-and-live-region]].
