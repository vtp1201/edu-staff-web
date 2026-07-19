---
name: us-e23.2-qa-patterns
description: Post-login select-tenant screen QA pass — real viewport-overflow + a11y-role-conflict defects found by writing new tests, not trusting prior gates
metadata:
  type: project
---

US-E23.2 (post-login select-tenant screen) QA pass found 2 real MAJOR defects
that tech-lead/a11y-auditor sign-off had missed, both via writing genuinely
new tests rather than re-reading existing ones:

1. **CSS-Grid `min-width:auto` overflow recurs per call-site, not just per
   component.** US-E23.1 already fixed this exact bug class in
   `DialogContent` (see [[us-e23.1-qa-patterns]]), but US-E23.2's OWN
   `<div className="grid gap-3">` wrapping `TenantCard` in `select-tenant.tsx`
   has the same missing-`min-w-0` defect — a fresh instance, not a
   resurfaced old one (confirmed: `tenant-card/` stories still 18/18 green).
   **Lesson: a shared-component fix does NOT protect a NEW grid/flex wrapper
   built around that component elsewhere — check every call site's own
   container, not just the component's internal tests.**
   Repro recipe: use a *realistic long* name/address (not the short curated
   mock strings used in the happy-path story) + `page.viewport(320, 800)` +
   `getBoundingClientRect().right` on the card. Short curated names
   ("THPT Chu Văn An") fit fine at 320px — the bug only surfaces with the
   Edge-Case-Matrix's own "max-length name/address" scenario, which is why
   the design-review's "320px OK" claim was true for the story it checked and
   false for the scenario the spec explicitly calls out.

2. **`role="alert"` on an `<h1>` silently defeats a "heading-nav" a11y fix.**
   An explicit ARIA `role` attribute overrides the *implicit* host-language
   role in the accessibility tree — so `<h1 role="alert">` is exposed to AT
   as `alert`, NOT `heading`. `getByRole("heading", {name})` finds nothing
   where `getByRole("alert")` does. If an a11y finding's stated purpose is
   "expose X as a heading for heading-navigation," always assert
   `getByRole("heading", ...)` directly on the fixed element — don't just
   assert the OTHER role still works (that's necessary but not sufficient;
   the two are mutually exclusive for a single element/role attribute).

Debugging recipe used to confirm #1 was real (not a test-isolation artifact
from prior stories leaving DOM/toasts mounted in the same browser session):
wrote a throwaway single-story debug file (`debug-viewport.stories.tsx`),
ran it in isolation (`bunx vitest run --config vitest.storybook.mts <file>`),
used `expect(x).toBe(-1)` as a deliberate-failure trick to force the assertion
error message to print the actual measured numbers (plain `console.log` in
browser-mode Storybook tests doesn't reliably surface to the CLI reporter).
Deleted the debug file after confirming; encoded the real assertion into the
permanent story instead.

`bunx vitest run --config vitest.storybook.mts <file>` is the correct
invocation (not `bun vitest:storybook` with `-t` filters — filters don't
match story names reliably in addon-vitest; pass the file path instead, per
[[us-e10.6-qa-patterns]]).
