# 0027 Accessible Status Text Tokens (success + error on white)

Date: 2026-06-13

## Status

Accepted

## Context

The EduPortal design system defines status colors as vibrant brand hues optimised for
**backgrounds and icons on dark/contrasting surfaces**:

- `--edu-success: #13DEB9` — passes 3:1 as a UI icon on dark bg, fails 1.74:1 on white.
- `--edu-error: #FA896B` — fails 2.36:1 on white (large text threshold).

These tokens work correctly as:
- Icon colors inside the 15%-opacity icon-box in `DefaultStatCard` (the box itself provides
  the contrasting surface).
- Trend-chip text in `DefaultStatCard` (small use, accepted visual affordance per existing spec).

They fail WCAG 2.1 SC 1.4.3 (AA, large text 3:1) when used as the **primary value text in
`CompactStatCard`** (24px / semibold on white card) and as **icon colors in `MiniStatCard`**
(UI non-text, 3:1 per SC 1.4.11) where the background is `bg-muted/50` ≈ `#FAFBFD`.

Discovered during the a11y audit for US-E07.3 (StatCard variants). The same issue already
exists on the `DefaultStatCard` trend chip, but that usage is a small decorative affordance
(not status-critical information) — deferred. This ADR only covers the two new variant usages.

## Decision

Add two new CSS custom properties to `src/app/tokens.css` (accessible dark versions of the
status hues for **text on white/light surfaces**):

```css
--edu-success-text: #007a6e;   /* teal dark — 5.4:1 on #FFFFFF */
--edu-error-text:   #c0392b;   /* red dark  — 5.1:1 on #FFFFFF */
```

Map both to Tailwind via `@theme` in `globals.css`:

```css
--color-edu-success-text: var(--edu-success-text);
--color-edu-error-text:   var(--edu-error-text);
```

Apply:
- `compactToneClass("success")` → `text-edu-success-text` (was `text-edu-success`)
- `compactToneClass("error")`   → `text-edu-error-text`   (was `text-edu-error`)
- Parent-dashboard Trophy icon  → `text-edu-success-text` (was `text-edu-success`)

CalendarCheck icon fix uses existing token `text-primary` (`#4570EA`, 4.56:1) — no new token.
Label fix uses existing `text-edu-text-secondary` (`#5A6A85`, ~5.9:1) — no new token.

The original vibrant tokens (`--edu-success`, `--edu-error`) **remain unchanged** — they are
still correct for backgrounds, icon-box interiors, and anywhere the surrounding surface
provides sufficient contrast. This ADR does not deprecate them.

## Alternatives Considered

1. **Use `text-foreground` for all toned values.** Eliminates the contrast problem entirely,
   but loses the semantic color signal that "present=good, absent=bad" — useful for sighted
   users. Rejected in favour of a compliant dark variant.

2. **Replace value text with a colored icon + neutral text.** More accessible by design, but
   requires layout changes that could break the compact variant's visual compactness. Deferred
   as a UX improvement, not needed for AA compliance.

3. **Use `--edu-primary-dark` (#4570EA) for all toned values.** Passes contrast but removes
   semantic differentiation between success and error. Rejected.

## Consequences

Positive:
- `CompactStatCard` and `MiniStatCard` now pass WCAG 2.1 SC 1.4.3 (large text ≥3:1) and
  SC 1.4.11 (UI non-text ≥3:1) for success/error tones.
- Two new tokens available for any future text-on-white status usage.

Tradeoffs:
- `--edu-success-text` (`#007A6E`) and `--edu-error-text` (`#C0392B`) are visually darker /
  less vibrant than the original palette hues — intentional for AA compliance.
- Slight visual delta from the original `Stat`/`ChildStat` appearance (which already violated
  WCAG — the delta corrects the violation, it does not introduce a regression).

## Follow-Up

- Audit `DefaultStatCard` trend-chip (`text-edu-success` / `text-edu-error` at `text-xs`)
  in a separate story — deferred because trend chips are decorative affordances with redundant
  arrow icons. If an explicit accessibility ticket is raised, apply the same text-token swap.
- `docs/product/design-system.md` §Palette should document `--edu-success-text` and
  `--edu-error-text` as the "text on white" variants.
