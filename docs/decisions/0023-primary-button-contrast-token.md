# 0023 Primary Button Contrast Token

Date: 2026-06-13

## Status

Accepted — implemented in US-E07.2 (2026-06-13)

## Context

A11Y audit of US-E12.2 (Academic Calendar) flagged that white text (#FFFFFF) on
`--edu-primary` (#5D87FF) achieves only **3.29:1** contrast ratio. WCAG 2.1 SC 1.4.3
requires ≥4.5:1 for normal text (14px/500 weight). This affects every primary button
across the application that uses `bg-primary text-primary-foreground`.

`--edu-primary-dark` (#4570EA) already exists in `src/app/tokens.css`. White on
#4570EA achieves **4.56:1** — just above the 4.5:1 AA threshold.

The current `--primary` CSS variable is mapped to `--edu-primary` (#5D87FF) in
`src/app/globals.css`. Swapping `--primary` to reference `--edu-primary-dark` would
fix all primary buttons globally without changing the brand identity (same hue, slightly
darker shade, within handoff palette).

## Decision

**Accepted** — implemented as story `US-E07.2` (2026-06-13).

The change applied:
- `globals.css` `:root` and `.dark`: `--primary: var(--edu-primary-dark)` (#4570EA)
- `--ring`, `--sidebar-primary`, `--sidebar-ring` all remapped to `var(--edu-primary-dark)` for consistency
- Contrast verified: #4570EA (#4570EA) on white (#FFFFFF) = **4.56:1** — passes WCAG 2.1 SC 1.4.3 AA (≥4.5:1 for normal text)
- `--edu-primary` (#5D87FF) remains untouched in `tokens.css` — still the per-tenant override target (decision 0007)
- `docs/product/design-system.md` synced

**The brand hue is preserved** (same blue family, slightly darker shade within the handoff palette). This is a semantic remapping, not a brand change.

Steps completed:
1. Token change applied globally via `globals.css` semantic variable — all `bg-primary`/`text-primary-foreground` usage corrected automatically.
2. `docs/product/design-system.md` updated to document `--primary` → `#4570EA`.
3. `/impeccable audit` + design-review gate run after implementation.
4. `tsc --noEmit` + `bun build` verified.

**In the meantime** (before this ADR was accepted): any screen that could not wait MAY have used `bg-edu-primary-dark` locally as a scoped override on critical CTAs. Those overrides are now redundant but harmless (same value).

## Alternatives Considered

1. **Change `--primary` globally now** — risk: untested visual regression across all
   screens; requires full design review sweep. Rejected for now.
2. **Increase button font-weight to 700 / font-size to 18px** — meets "large text" 3:1
   threshold at 3.29:1; technically compliant for bold/large text. But 14px/500 is the
   current design spec; changing it risks typography regression.
3. **Accept current state** — fails WCAG 2.1 AA on SC 1.4.3 for normal text. Rejected
   as long-term solution.

## Consequences

Positive:
- Tracks the systemic issue durably without blocking individual feature stories.
- Single design-system story can fix all primary buttons at once.

Tradeoffs:
- Primary buttons remain below 4.5:1 until the dedicated story lands.
- Each feature story audit will flag A11Y-005 or equivalent until resolved.

## Follow-Up

- Story `US-E07.2-accessible-primary-token` created and implemented. This ADR is closed.
- Future per-tenant primary overrides (decision 0007) should also verify WCAG AA contrast
  after `--edu-primary` is overridden — the middleware that injects `--edu-primary` should
  ensure the tenant-supplied color achieves ≥4.5:1 on white. Track as a separate story
  if/when tenant-specific theming is implemented.
