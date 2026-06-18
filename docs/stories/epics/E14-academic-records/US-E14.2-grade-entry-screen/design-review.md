# US-E14.2 — Design Review

## Token audit (tokens-only, no raw color)
- Surfaces: `bg-card`, `bg-muted`, `bg-background`, `border-border`,
  `shadow-card`, `rounded-card`.
- Text: `text-foreground`, `text-muted-foreground`.
- Score colors (existing tokens, verified in `tokens.css` + `globals.css`
  `@theme`): `text-edu-success-text` (#007a6e), `text-edu-error-text` (#c0392b).
- Error state: `border-destructive`, `ring-destructive`, `text-edu-error-text`.
- Focus: `focus-visible:ring-ring`.
- **No new tokens required → no ADR needed.**
- Score-color rule is proportional (≥80% → success, <50% → error) so SCALE_10
  and SCALE_4 share one rule, matching design-system §Score/performance.
- impeccable PostToolUse hook: no anti-patterns flagged on any file.

## Typography
- Page title `text-2xl font-extrabold` (22px/800 page-title spec).
- Column/header labels `text-xs uppercase tracking-wide font-bold` (label spec).
- Body cells `text-sm`; average `font-bold`.

## Accessibility (WCAG 2.1 AA)
- Editable cells: `<input type="number">` with `aria-label`
  (`cellLabel` → "Điểm {column} của {student}"), `aria-invalid` on out-of-range,
  `aria-describedby` → error `<span>` (text + color, not color alone).
- Out-of-range message is real text via i18n (`errorOutOfRange`).
- Filters: `<Label htmlFor>` linked to each `Select`.
- Publish dialog: Radix AlertDialog semantics preserved; title via
  `aria-labelledby`. Confirm/Cancel keyboard reachable.
- Banner uses `role="status"` for save/publish feedback.
- Table uses `role="grid"` (editable grid) with sticky header; one scoped
  biome-ignore documents the intentional interactive role.
- Focus ring visible (`focus-visible:ring-2 ring-ring`); no `outline:none`.

## States covered (Storybook)
Loading, NoSelection, WithScores, PublishConfirmDialog, PublishedReadonly,
PendingApproval, ValidationError, EmptyClass — all with play() assertions.
