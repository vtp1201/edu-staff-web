# 0031 Pagination Accessible Primary Token — --edu-primary-accessible

Date: 2026-06-13

## Status

Accepted

## Context

Finding A11Y-005 from the US-E12.4 student-roster accessibility audit identified
that the active pagination button uses `--edu-primary-dark` (`#4570EA`) as its
background on a white card surface. The measured contrast ratio is **4.41:1**,
which falls 0.09 below the WCAG 2.1 SC 1.4.3 AA threshold of **4.5:1** for
normal text (the pagination button label is `text-xs font-bold` = 12px/700 weight,
which is below the large-text threshold of 18px / 14px bold).

The `--primary` semantic variable (currently `--edu-primary-dark`) cannot be
darkened globally without breaking other contexts (e.g. the primary button where
white text is on top — white on `#4570EA` = 4.41:1 which is still above 3:1 for
UI components/large text per WCAG 1.4.11 Non-text Contrast).

A dedicated token is required for contexts that require AA contrast (4.5:1) for
small text on a white background.

## Decision

Add `--edu-primary-accessible: #4468e0` to `src/app/tokens.css`.

- **#4468e0 on white**: 4.88:1 (passes WCAG AA for normal text ≥ 4.5:1)
- **White text on #4468e0**: 4.88:1 (passes WCAG AA for normal text)
- Hue stays within the brand blue family, visually indistinguishable from `--edu-primary-dark` at a glance

Map as `--color-edu-primary-accessible` in `globals.css` `@theme`.

Apply to `roster-pagination.tsx` active page button: replace `bg-primary border-primary`
with `bg-edu-primary-accessible border-edu-primary-accessible`.

The `--primary` semantic variable and all other primary-color usages are unaffected.

## Alternatives Considered

1. **Darken `--edu-primary-dark` globally** — rejected; `#4570EA` → darker would
   reduce brand fidelity across all primary usages and could introduce new contrast
   issues for dark-mode or reversed text scenarios.

2. **Use `text-primary-foreground` (white) on a larger touch target** — not
   applicable; the pagination button size is fixed by the design spec; the issue is
   the background color contrast for the page number text, not the foreground.

3. **Treat pagination number as "large text"** — rejected; 12px/700 (bold) is not
   large text by WCAG definition (large text = ≥ 18px regular or ≥ 14px bold).
   12px bold does not qualify.

## Consequences

Positive:
- Closes A11Y-005 finding; pagination active state now passes WCAG 2.1 AA (4.88:1).
- Minimal token addition; consistent with existing pattern of per-purpose accessible
  tokens (decision 0027 for success/error text, decision 0029 for concept/gender tokens).
- Zero regression: `--primary` and all downstream components untouched.

Tradeoffs:
- One additional CSS variable in the token set; negligible bundle impact.
- Token must be documented in `docs/product/design-system.md` to prevent drift.

## Follow-Up

- Apply to any future pagination components that use the same small-text active pattern.
- Review whether `--primary` should be further darkened in a future ADR to unify
  all primary small-text usages (out of scope for this story — requires design approval).
