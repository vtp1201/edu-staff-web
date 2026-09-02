---
name: gotcha-locked-row-and-token-gap
description: A "disabled/locked" row must state its reason in VISIBLE text (never a title tooltip), and there is no AA-safe --edu-info text token — so info-toned labels use text-muted-foreground
metadata:
  type: feedback
---

Two a11y traps hit on US-E24.3 (student course timeline):

1. **A non-interactive `aria-disabled` row cannot use `title` as its
   explanation.** The design (and the architect's contract) specified a hover
   tooltip "Nội dung sẽ mở lúc …" on an unreleased EXAM row. That row is out of
   the tab order by design, so `title` is unreachable by keyboard AND by touch —
   the reason would be invisible to most users who need it. Render it as a
   VISIBLE line inside the row instead (`bg-edu-info-light` strip + clock icon).
   **Why:** same family as the US-E24.2 `summaryError` finding — a tooltip is
   never an acceptable sole carrier of information.
   **How to apply:** any "disabled because X" affordance → X is visible text.

2. **`--edu-info` (#539bff) has NO accessible text sibling** (`tokens.css` has
   `-light` only; success/error/warning/purple/teal all have `*-text`). So an
   info-toned LABEL cannot be `text-edu-info` at any small size. Use
   `text-muted-foreground` (= `--edu-text-secondary`, 5.48:1) with the coloured
   dot as decoration beside it. `StatusBadge`'s `info` tone already does the
   same thing (`bg-edu-info/15 text-edu-text-primary`).
   **Why:** adding `--edu-info-text` would need an ADR + `tokens.css` +
   `@theme` + doc sync — not a mid-story change.
   **How to apply:** if a design asks for coloured info/teal/purple small text,
   check `tone.ts`'s `TONE_TEXT_ACCESSIBLE` first; if the tone has no entry,
   demote the label to `text-muted-foreground` and flag the token gap rather
   than shipping a 2.9:1 label.

Also: an 11px type label (`Bài giảng · …`) is SMALL text — `--edu-warning-text`
is only ~4.7:1 on white and lower on `bg-muted`, so tone colour belongs on the
chip, not on the label.

Related: [[pattern-week-grouped-timeline-rebuild]], [[pattern-capped-count-and-badge-accname]].
