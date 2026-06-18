# Design Review — US-E11.4 Teaching Plan / PPCT

## Gate

impeccable audit: PASS (no anti-patterns detected on any file during implementation)

## Token compliance

All color usage via semantic tokens only:
- Grid background: `bg-card`, `bg-muted/40`
- Rejection banner: `bg-edu-error/10 border-edu-error/30 text-edu-error-text` (WCAG AA dark text on light tint)
- Status badges via StatusBadge shared component: `muted` (DRAFT), `primary` (SUBMITTED), `success` (APPROVED), `error` (REJECTED)
- Text: `text-foreground`, `text-muted-foreground`, `text-card-foreground`
- Borders: `border-border`
- Focus rings: `focus-visible:ring-ring`

No raw colors, no hex values, no Tailwind palette classes (slate/gray/etc).

## Accessibility (WCAG 2.1 AA)

- Grid implemented as semantic `<table>/<thead>/<tbody>/<tr>/<th scope="col">/<th scope="row">/<td>` — proper screen-reader col/row header associations; biome `useSemanticElements` satisfied without suppressions
- All `<button>` elements for interactions (no `div role="button"`)
- Empty-cell add buttons have `aria-label` via `t("grid.addCell", { week, period })` 
- `PlanCellForm`: `<Label htmlFor>` connected to each input; `aria-invalid` + `aria-describedby` on title field for error state; `autoFocus` for keyboard UX on inline edit open
- `ApproveDialog` / `RejectDialog`: Radix Dialog primitives — ARIA modal semantics, focus trap, Esc close
- Container div keyboard shortcut handler (Ctrl+Enter/Esc) uses `biome-ignore lint/a11y/noStaticElementInteractions` with documented reason
- Rejection banner uses `text-edu-error-text` (dark token) — passes AA contrast on `bg-edu-error/10`
- Status-only content always has text label alongside (StatusBadge), not color alone

## Typography hierarchy

- Page title: `text-2xl font-extrabold text-foreground` (22px/800)
- Subtitle: `text-sm text-muted-foreground`
- Grid column/row headers: `text-xs font-bold uppercase tracking-wide text-muted-foreground`
- Cell body: `text-sm text-foreground`
- Plan label (subject/class/term): `text-sm font-bold text-foreground`
- Error text: `text-xs text-edu-error-text`

## Spacing / radius

- Page padding: `p-6`, section gaps: `gap-6`, `gap-4`
- Cards: `rounded-[var(--edu-radius-card)]` (12px)
- Grid cells: consistent `px-3 py-2` headers; `p-1` editable cells
- Principal plan cards: `p-5 shadow-card`

## Design-review verdict

APPROVED — no anti-patterns, full token compliance, semantic HTML grid, WCAG AA contrast, proper keyboard and ARIA patterns throughout.
