---
name: feedback-pure-css-story-pattern
description: How to spec pure CSS/layout polish stories with no BE, no new tokens, no new i18n keys — pattern from E17 UX polish stories
metadata:
  type: feedback
---

For pure CSS/layout polish stories (E17 pattern):

**Why:** E17 stories (responsive grid, grade table mobile, messaging pane toggle) are all already-implemented screens needing CSS fixes only. The pattern is distinct from feature stories — no domain layer, no infrastructure, no new tokens.

**How to apply:**
- §4 Functional Spec: lead with exact file path + line reference + before/after class/style change for every affected file. This is the load-bearing section for FE.
- §6 AC: number sequentially (AC-01, AC-02 ...) not per-UC. Include: loading state, error state, empty state (or note out-of-scope), success at 375/768/1280 px, DOM order, i18n key count assertion.
- §7 Dependencies: always check Blocks carefully — CSS wrapper structure changes (grade-book-table, messaging pane) can be depended on by a later empty-state story.
- §8 Traceability: Integration column = "None (CSS only)" for all rows; still list every TR-XXX.
- story.md Design Notes: put exact file:line + before/after directly here — engineers read story.md first.
- Storybook viewport story at 375 px is mandatory proof for every responsive fix.
- Inline style (`style={{ WebkitOverflowScrolling: 'touch' }}`) is the correct approach when no Tailwind utility exists — call it out explicitly so FE does not reach for arbitrary CSS.
- `motion-reduce:transition-none` Tailwind utility replaces `@media (prefers-reduced-motion: reduce)` explicit CSS — call out which mechanism is used so reviewer can verify.
- Open Questions: always flag i18n key assumption (aria-label, back button label) as [OQ-XXX] even when "assumed to exist" — FE must confirm before closing.
