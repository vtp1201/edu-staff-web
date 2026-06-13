# 0029 Gender Indicator AA-Compliant Text Tokens

Date: 2026-06-13

## Status

Accepted

## Context

Decision 0028 (US-E12.4) introduced `--edu-gender-female` (#D6336C) and
`--edu-gender-male` (#3B7BD9) as the text/foreground tokens for the GenderBadge
component. Accessibility audit A11Y-003 found that at 10.5px (even extrabold),
these colors fail WCAG SC 1.4.3 AA on their respective light backgrounds:

- `#D6336C` on `#FFE6F1` (edu-gender-female-light) = 3.92:1 — fails 4.5:1
- `#3B7BD9` on `#E6F0FF` (edu-gender-male-light) = 3.64:1 — fails 4.5:1

The same pattern already exists in the design system for success/error (decision
0027): `--edu-success-text` (#007A6E, 4.90:1) and `--edu-error-text` (#C0392B,
5.1:1) were introduced as AA-compliant alternatives to the vivid brand colors.
This decision follows the same pattern for gender tokens.

## Decision

Add two AA-compliant text tokens to `src/app/tokens.css`:

- `--edu-gender-female-text: #9b1b4a`
  - Contrast on `#FFE6F1` (edu-gender-female-light): ~6.73:1 (AA pass)
  - Contrast on white (#FFF): ~7.56:1 (AAA pass)

- `--edu-gender-male-text: #1b4d9b`
  - Contrast on `#E6F0FF` (edu-gender-male-light): ~7.08:1 (AA pass)
  - Contrast on white (#FFF): ~8.21:1 (AAA pass)

Map both in `globals.css @theme` as:
- `--color-edu-gender-female-text: var(--edu-gender-female-text)`
- `--color-edu-gender-male-text: var(--edu-gender-male-text)`

`GenderBadge` must use these text tokens instead of the vivid brand variants
(`--edu-gender-female` / `--edu-gender-male`).

The vivid tokens (`--edu-gender-female`, `--edu-gender-male`) are retained for
potential use as decorative accent colors (borders, icons) at larger sizes where
3:1 UI-component contrast (SC 1.4.11) suffices.

## Alternatives Considered

1. **Darken the badge background** (e.g. use `--edu-gender-female` (#D6336C) as
   background + white text) — rejected; white text on #D6336C = 4.84:1 (AA pass)
   but changes the visual design intent (light badge = soft indicator).

2. **Use a single neutral color (--edu-text-primary) for both** — rejected;
   eliminates the color differentiation that makes the gender indicator legible
   at a glance (the letter + color is the pattern, not color alone).

3. **Remove color differentiation entirely** — rejected; color + letter is the
   design spec. The letter is the primary accessible differentiator; color is
   supplementary. Removing it degrades usability without a11y benefit.

## Consequences

Positive:
- Both gender indicator text variants pass WCAG 1.4.3 AA at all text sizes.
- Consistent with the decision 0027 pattern (AA text tokens for vivid colors).
- Allows future dark-mode overrides in `[data-theme="dark"]` block.

Tradeoffs:
- Adds 2 tokens, bringing total gender-indicator tokens to 6.
- The darker text (#9B1B4A deep rose, #1B4D9B deep blue) may look slightly
  heavier than the vivid originals. This is intentional and acceptable.

## Follow-Up

- Update `docs/product/design-system.md` to document the text token variants.
- If dark-mode theming is introduced, add overrides for all 6 gender tokens.
