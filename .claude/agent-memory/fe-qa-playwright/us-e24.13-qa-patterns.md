---
name: us-e24.13-qa-patterns
description: QA notes for US-E24.13 bell dropdown — rare case where self-report was fully accurate, plus two re-verification patterns worth reusing
metadata:
  type: project
---

US-E24.13 (bell Popover dropdown, 3-tab preview, promoted `NotificationRow`,
mark-read/mark-all optimistic) — engineer self-report was **fully accurate**:
all claimed proof (repo `type=system` mutual-exclusivity test, `preview` query
key test, SSE prefix-invalidation test, identity-assertion test for the 3
Server Action props reaching `AppShell` unwrapped, 13 dropdown stories, header
focus-management + badge-decrement + mobile-Link stories, centre regression +
new system-tab story, locale-aware relative-time test) existed exactly as
described and all passed on independent re-run (`bun vitest run` 589/4956,
storybook vitest 171/1406, tsc/lint/build all clean).

**Why it was solid**: this story went through a real review-and-fix round
before reaching QA (`fe-tech-lead-reviewer` + `fe-accessibility-auditor` found
3 blocking a11y issues — dangling `aria-controls`/no `TabsContent`, silent
optimistic updates, undersized touch target — all fixed with dedicated proof
stories named after the defect, e.g. `BellDropdownFocusesTablistWithNoUnread`,
`BellBadgeDropsOnMarkRead`). Story-naming-after-the-regression is a good
signal the fix is genuinely tested, not just claimed.

**Two gaps closed by fresh QA assertions** (both landed in the existing
`notification-dropdown.stories.tsx`, not new files — cheapest way to
independently re-verify without duplicating story setup):
1. Live-region existence: the engineer's own story never actually queried for
   `role="log"`/`aria-live="polite"` — it only asserted the *effect* (row text
   changes). Added a direct `canvas.findByRole("log")` +
   `toHaveAttribute("aria-live","polite")` + `toHaveAccessibleName()` check in
   `AllTab`. This is the general pattern: "silent update is now announced" AC
   needs a check that the live-region DOM node exists **on mount**, not only
   that the visual diff happened.
2. Touch-target measurement: the story asserted the button via `className`
   presence in the source (`min-h-11`), never `getBoundingClientRect()`.
   Added a real rect measurement to `MarkAllRead`. General pattern: never
   trust a Tailwind class name as proof of a physical pixel size — a sibling
   flex/shrink rule or a later utility override can silently defeat it at
   runtime; measure the actual box.

Both were additive edits to the SAME story file the engineer wrote (not new
story/test files) — reusing existing fixtures/decorators is cheaper and less
error-prone than re-deriving mock setup, as long as the new assertion is
independent of what the story already checked.
