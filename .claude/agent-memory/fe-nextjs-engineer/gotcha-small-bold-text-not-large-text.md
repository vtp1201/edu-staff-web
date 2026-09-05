---
name: gotcha-small-bold-text-not-large-text
description: Tiny extra-bold count pills/badges are NOT "large text" — a tinted bg needs text-foreground (11.5:1), not text-edu-primary-accessible (4.35:1 on edu-primary-light)
metadata:
  type: feedback
---

A `font-extrabold text-[10.5px]` count pill does **not** qualify as WCAG "large text"
(that needs ≥18px, or ≥14px bold), so it must hit the full **4.5:1**. On
`bg-edu-primary-light` (#ECF2FF), `text-edu-primary-accessible` (#4468E0) is only
**4.35:1** and fails; `text-foreground` (#2A3547) is 11.5:1 — this is exactly the pairing
`StatusBadge` already uses for the primary/info/purple/teal tones.

**Why:** flagged as A11Y-001 (Major) by `fe-accessibility-auditor` on US-E24.4
(`cross-subject-list.tsx` sub-tab count pill). `text-edu-primary-accessible` is safe at
normal body sizes, which makes it tempting to reuse for a shrunken bold pill — the extra
weight does not buy the large-text exemption.

**How to apply:** whenever tinting a small badge/pill/chip (< 14px, any weight) on an
`-light` brand background, use `text-foreground`; reserve `text-edu-primary-accessible`
for ≥ body-size brand text. Even an `aria-hidden` pill counts — 1.4.3 is about what
sighted users see, not the accessible name. Compare against `StatusBadge` before minting
a new tone pairing.

Related: [[gotcha-locked-row-and-token-gap]], [[gotcha-tone-and-duplicate-i18n-copy]].
