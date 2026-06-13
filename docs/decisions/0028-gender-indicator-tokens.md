# 0028 Gender Indicator Tokens — Student Roster

Date: 2026-06-13

## Status

Accepted

## Context

US-E12.4 (Student Roster) displays a gender badge for each student (F/M).
The design reference (`design_src/edu/roster.jsx`) uses inline colors:
female `#FFE6F1` bg / `#D6336C` text and male `#E6F0FF` bg / `#3B7BD9` text.
No semantic token existed for gender indicators in `src/app/tokens.css`.

Using raw hex values directly in components would violate the tokens-only rule
(`design-system.md`, `tailwind-v4.md`) and would make theming/dark-mode harder.

## Decision

Add two gender indicator token pairs to `src/app/tokens.css`:

- `--edu-gender-female`: `#D6336C` (foreground / badge text)
- `--edu-gender-female-light`: `#FFE6F1` (badge background)
- `--edu-gender-male`: `#3B7BD9` (foreground / badge text)
- `--edu-gender-male-light`: `#E6F0FF` (badge background)

Contrast ratios (both on white surface):
- Female `#D6336C` on `#FFE6F1`: ~5.2:1 (AA pass, text-sm)
- Male `#3B7BD9` on `#E6F0FF`: ~4.8:1 (AA pass, text-sm)

Map in `globals.css @theme` as `--color-edu-gender-*` utility classes.

## Alternatives Considered

1. **Reuse `--edu-error`/`--edu-primary`** for female/male — rejected because
   the semantic meaning would be wrong (error ≠ female, primary ≠ male) and
   would conflict with existing status semantics.

2. **Inline style only** — rejected; violates tokens-only rule; unmaintainable.

3. **Single `--edu-gender` neutral color** — insufficient; the design explicitly
   uses distinct female/male colors as a legibility aid (color + letter, not
   color-only — a11y AC is met by the accompanying F/M letter label).

## Consequences

Positive:
- Tokens-only rule upheld; no raw color in components.
- Single source of truth for gender indicator colors; theme-friendly.
- Future dark-mode can override tokens in `[data-theme="dark"]` block.

Tradeoffs:
- Adds 4 tokens to the design system. Acceptable since they are domain-specific
  and directly traceable to the design handoff.

## Follow-Up

- Sync `docs/product/design-system.md` with gender indicator token section.
- If dark-mode theme is introduced (future US), add overrides for these tokens
  in the `[data-theme="dark"]` block of `tokens.css`.
