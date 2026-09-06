---
name: warning-foreground-on-tint-dark
description: text-edu-warning-foreground on a bg-edu-warning/15 tint is ~1.1:1 in dark mode — a repo-wide defect class, ~50 call sites
metadata:
  type: project
---

`--edu-warning-foreground` (#2a3547 navy) is the fixed tone for text on **solid**
yellow and deliberately has **no dark value**. Paired with a *tinted* chip
(`bg-edu-warning/15`) over a dark card it composites to ~1.10:1 — invisible.

**Why:** confirmed in US-E24.12 (dark-token pass). Light mode
`--edu-warning-foreground` === `--edu-text-primary` === `#2a3547`, so swapping to
`text-edu-text-primary` is a **zero-diff light-mode change** and a real dark-mode
fix — the same thing info/purple/teal tones already do. US-E24.12 fixed
`components/shared/status-badge` only; `components/shared/stat-card` (`STAT_TONE.warning.icon`)
and ~50 feature sites (grep `text-edu-warning-foreground`) still carry it, incl.
`features/grades/.../batch-status-badge.tsx` which also duplicates StatusBadge
inline (component-organization violation).

**How to apply:** on any dark-mode/token story, grep `text-edu-warning-foreground`
in the touched files. Keep it ONLY where the background is solid `bg-edu-warning`.
On a `/15`-`/20` tint it is a blocking a11y finding. Also check the story's Dark
story actually exercises the warning tone — a `Dark` story pinned to `tone="success"`
proves nothing. Related: [[recurring-violations]].
