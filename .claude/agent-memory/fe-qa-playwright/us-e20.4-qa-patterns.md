---
name: us-e20.4-qa-patterns
description: parent children overview QA — rare fully-accurate self-report across parity/contrast/retry-suppression fixes; clean PASS
metadata:
  type: project
---

US-E20.4 (parent children overview, closes dead `/parent/children` sidebar link):
independently re-verified every claim in the packet's Review-fix pass and ALL of
them held up exactly as described — no gap found. Notable verification points:

- Parity fix: `child-identity-header.tsx`'s `FALLBACK_TEXT` size-keyed map
  (`{md:"text-xs", lg:"text-sm"}`) genuinely restores `parent-dashboard.tsx`'s
  pre-promotion `text-sm` (shadcn `AvatarFallback` default), locked by
  `DashboardShape`/`OverviewCardShape` stories asserting `toHaveClass("text-sm")`
  **and** `not.toHaveClass("text-xs")` — a real regression-lock, not just a comment.
- Contrast fix: `identityToneClass()` swapped `text-primary`→
  `text-edu-primary-accessible` and `text-edu-purple`→`text-edu-purple-text`;
  grep confirmed the old fill tokens only appear in doc comments (explaining the
  fix), never in emitted classes; a negative-guard unit test
  (`never emits the sub-4.5:1 fill tokens`) locks it.
- Forbidden-retry suppression: `ListError`'s `showRetry` prop is a real
  `{showRetry && <Button>}` conditional (button omitted from DOM, not disabled/
  hidden) — confirmed by reading the component, not just trusting the claim.
  `ForbiddenNoRetry` story asserts `queryByRole("button", ...)).not.toBeInTheDocument()`.
- No "Con thứ N" ordinal fallback anywhere in the new files (grep-clean) — this
  screen correctly reuses `parent-links`' real-name entity, not `timetable`'s
  `TimetableChild` (which has the documented residual gap).
- Whole-card-as-`<Link>` pattern (no div+onClick, no nested interactive
  elements) genuinely gives one tab stop — verified via story's own
  `userEvent.tab()` sequence asserting focus moves card→card.
- `bun vitest run` 453/3263 and Storybook browser suite (24+11=35 relevant
  stories across children-overview-screen, child-identity-header,
  parent-consent-section) all green, matched self-report numbers exactly.
  `parent-dashboard.tsx` is RSC-only with no `.stories.tsx` of its own (parity
  proven via the shared component's `DashboardShape`/`OverviewCardShape`
  stories instead — correct substitute, not a gap).
- Verdict: PASS, no new tests needed to close any AC gap.

See also [[us-e20.3-qa-patterns]] (same feature area, parent-links/consent).
