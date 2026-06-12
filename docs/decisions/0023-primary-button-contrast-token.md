# 0023 Primary Button Contrast Token

Date: 2026-06-13

## Status

Proposed

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

Track as **Proposed** — do not apply the token change in any single feature story.
This requires a dedicated design-system story (E07 epic or a new E07.x) to:

1. Verify the change visually against all screens using primary buttons.
2. Update `globals.css` `@theme`: `--primary: var(--edu-primary-dark)` (or a new
   `--primary-accessible` token).
3. Update `docs/product/design-system.md` to reflect the accessible primary shade.
4. Run `/impeccable audit` across affected screens after the change.
5. Get explicit product/design sign-off (since this touches brand color presentation).

**In the meantime**: any screen that cannot wait for the design-system story MAY use
`bg-edu-primary-dark` locally as a scoped override on critical CTAs. Document each
override in the story packet.

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

- Create story `US-E07.x-accessible-primary-token` under E07 epic.
- Reference this ADR in that story packet.
- After token change: re-run `/impeccable audit` on Login, Dashboard, Attendance,
  Calendar, School Setup screens.
