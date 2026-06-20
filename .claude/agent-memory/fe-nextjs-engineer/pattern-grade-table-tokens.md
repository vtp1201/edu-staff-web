---
name: pattern-grade-table-tokens
description: Reusable conventions for grade/score tables — group-header tints, score color util, conduct badge reuse
metadata:
  type: feedback
---

When building a grade/score table in the `grades` feature, reuse these instead of inventing:

- **Group-header tint by assessment column type**: TX → `bg-primary/12`, GK →
  `bg-edu-warning/12`, CK → `bg-edu-error/12` (all token-only).
- **Score cell color**: `getScoreColorClass(score, 10)` from
  `features/grades/presentation/grade-entry-screen/score-color.ts` (≥80% success,
  <50% error, else foreground — proportional, scale-agnostic).
- **Conduct grade badge**: reuse the shared `StatusBadge`
  (`@/components/shared/status-badge`) with tones Tot→success, Kha→primary,
  TB→warning, Yeu→error. Do NOT make a new badge — and always render the text
  label (never color-only, a11y).
- **Table a11y**: native `<table>` + `<caption class="sr-only">` + `<th scope="col">`
  (rowSpan for group/average/conduct) + `<th scope="row">` per student. No role=grid on divs.

**Why:** US-E13.6 grade-book extended E14.2 grade-entry; these were the existing
spec'd conventions and reusing them keeps a single visual language across grade screens.
**How to apply:** any new grade/score matrix (other subjects, transcript, report card).

Related: [[pattern-extend-feature-separate-repo]], [[pattern-result-repo-vs-throwing]] (grades uses the throwing-repo + `T | Failure` use-case convention).
