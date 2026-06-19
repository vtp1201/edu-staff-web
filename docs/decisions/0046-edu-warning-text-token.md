# 0046 — Add --edu-warning-text semantic token

Date: 2026-06-20

## Status

Accepted

## Context

The 1506 design handoff uses `#9A6A0F` (dark amber) as a text color on
`warningLight` (`#FEF5E5`) backgrounds across 7 screens:
`assessment.jsx`, `audit-log.jsx`, `gradebook.jsx`, `grade-entry.jsx`,
`academic-record-view.jsx`, `announcements.jsx`, and `discipline.jsx`.

This follows the same pattern as the already-established
`--edu-success-text: #007a6e` and `--edu-error-text: #c0392b` tokens
(decision `0027`) — a darker semantic shade of the status color suitable for
text on the corresponding light surface.

The existing `--edu-warning-foreground: #2a3547` token is for text/icons
placed ON a full-warning background (the warning color itself as the
background). It is not the amber-on-light pattern.

Without a named token, FE engineers would use the raw hex `#9A6A0F` in 7+
implementation files, violating the tokens-only rule and making future color
changes require grep-and-replace.

**Contrast audit:**
- `#9A6A0F` on `warningLight` (#FEF5E5): **4.37:1** — passes for large/bold
  text (≥14px bold = WCAG "large text", threshold 3:1). Used in the handoff
  exclusively at 14px/800 weight or above. For smaller text, `--edu-warning-foreground`
  (#2a3547, 11.42:1 on warningLight) must be used instead.

## Decision

Add `--edu-warning-text: #9a6a0f` to `src/app/tokens.css` (analogous to
`--edu-success-text` and `--edu-error-text`). Map in `globals.css` `@theme`
block and document in `docs/product/design-system.md`.

**Usage rule:** `--edu-warning-text` is for text/icons conveying warning
emphasis on light surfaces (warningLight background). It is "large/bold only"
— FE must use it at ≥14px bold weight, never for body/small text (use
`--edu-warning-foreground` there).

## Alternatives Considered

1. Use `--edu-warning-foreground` (#2a3547) everywhere — loses semantic color
   (amber banner headings look identical to neutral text; warning emphasis lost).
2. Use `--edu-warning` (#FFAE1F) as text — fails WCAG contrast on any light
   surface (1.09:1 on white; 1.08:1 on warningLight).
3. Raw hex `#9A6A0F` in each component — violates tokens-only rule; hard to
   maintain.

## Consequences

Positive:

- FE has a named, tokenised way to implement the warning-text pattern that the
  handoff uses in 7 screens.
- Consistent amber heading color on warning callouts across all admin screens.
- Future brand updates change one token, not 7 files.

Tradeoffs:

- Token is "large/bold only" — must document constraint clearly; misuse on
  small text fails WCAG.
- Adds one more token to the system (minimal system complexity cost).

## Follow-Up

- Add `--edu-warning-text: #9a6a0f` to `src/app/tokens.css` after this ADR is
  registered (FE team — run /fe, or uiux-design-system-builder if doing a
  separate token pass).
- Map in `globals.css` `@theme` as `--color-edu-warning-text`.
- Update `docs/product/design-system.md` §Palette with the new token and its
  usage constraint.
- FE team: in all 7 affected screens, replace `#9A6A0F` with
  `var(--edu-warning-text)` or the Tailwind semantic class.
