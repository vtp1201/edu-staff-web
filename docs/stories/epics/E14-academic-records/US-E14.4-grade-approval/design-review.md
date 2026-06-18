# US-E14.4 — Design Review

## Tokens (no raw color)

- PENDING badge: `bg-edu-warning/15 text-edu-warning-foreground` (warning text is
  the dark foreground per a11y rule — never white on yellow).
- PUBLISHED badge: `bg-edu-success/15 text-edu-success-text`.
- LOCKED badge: `bg-muted text-muted-foreground`.
- Self-publish banner: `border-edu-info/30 bg-edu-info/10 text-edu-info`.
- Distribution bars: success / primary / warning / error / error-dark band tones;
  track `bg-edu-border`. Score values reuse `getScoreColorClass` (E14.2).

## Accessibility (WCAG 2.1 AA)

- Filter pills are `aria-pressed` buttons inside a `<fieldset>` + sr-only
  `<legend>` (Biome rejects `role=group`/`role=radio` on div; this is the repo's
  established pill pattern). Touch target `min-h-11`.
- Row checkboxes: `aria-label={selectBatchLabel(id)}`; header select-all:
  `aria-label={selectAllLabel}`; non-PUBLISHED rows disabled.
- Dialogs are Radix `AlertDialog` (approve / bulk-lock) and `Dialog` (revision) —
  focus-trap + ARIA preserved, not overridden.
- Revision Textarea: linked `<Label htmlFor>`, `aria-invalid` + `aria-describedby`
  on the min-10-char error (text, not color alone).
- Status conveyed by icon + text label, never color alone.
- Sheet spinner gated `motion-reduce:animate-none`; distribution bar transition
  is decorative width only.

## States covered (Storybook)

loading (skeleton) · list mixed · pending filter · review sheet · approve dialog ·
revision dialog · bulk-lock dialog · self-publish warning · empty.

## impeccable

PostToolUse design-hook scanned every new component on write — no anti-patterns
reported. Layout/typography follow the EduPortal design system (page-title 22/800,
label uppercase tracking, card radius var token).
