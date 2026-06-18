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

---

## Design-review gate verdict (impeccable audit + critique) — 2026-06-18

**Reviewer:** fe-nextjs-engineer (design-review gate run)
**Scope:** grade-entry-table.tsx, grade-entry-screen.tsx, grade-entry-skeleton.tsx,
score-color.ts. Impeccable scoped to flagging gaps only — palette/layout/tokens
are the design-system source of truth and were NOT altered.

### Verdict: **PASS**

All eight checklist dimensions clear. No raw color, no arbitrary color values,
typography/spacing/radius/score-color/state-coverage/shadow/badges conform to
`design-system.md` + `tokens.css`.

### Checklist results

1. **Tokens-only — PASS.** No `#`, `slate-`, `gray-`, `zinc-` in any component
   file. No `bg-[...]`/`text-[...]` arbitrary color values. The two `rounded-[8px]`
   /`ring-1` usages are radius/width (allowed), not color. Surfaces (`bg-card`,
   `bg-muted`, `bg-background`, `border-border`), text (`text-foreground`,
   `text-muted-foreground`), score colors (`text-edu-success-text`,
   `text-edu-error-text`), error state (`border-destructive`, `ring-destructive`)
   all map to verified `@theme` entries.
2. **Typography — PASS.** Page title `text-2xl font-extrabold` (22px/800).
   Header/column labels `text-xs font-bold uppercase tracking-wide` (label spec
   12px/700). Body cells `text-sm` (13-14px). Average `font-bold text-sm`.
3. **Spacing — PASS.** Screen container `p-5` (20px) + `gap-5`; filter row
   `gap-4` (16px). Table header cells `px-3 py-2.5`, body `px-3 py-2`, editable
   cells `px-2 py-1.5` — appropriate dense table padding within tolerance.
4. **Radius — PASS.** Score input cells use `rounded-[8px]` (btn 8px spec ✓).
   Card wrappers (table, empty, skeleton) use `rounded-card`. Banner uses
   `rounded-[8px]`.
5. **Score colors — PASS.** `score-color.ts` implements the proportional rule:
   ratio ≥ 0.8 → `text-edu-success-text`, ratio < 0.5 → `text-edu-error-text`,
   else `text-foreground`. Matches design-system §Score/performance and works for
   SCALE_10 (8/<5) and SCALE_4 (3.2/<2). Null → neutral.
6. **State coverage — PASS.** isLoading → Skeleton; no-selection → EmptyState;
   error → EmptyState(error msg); empty class → EmptyState; populated →
   GradeEntryTable. All four required states present plus read-only/locked variant.
7. **Shadow — PASS.** Table card, empty state (border-dashed, no shadow is
   intentional for empty), and skeleton card use `shadow-card`.
8. **Status badges — PASS.** Published uses semantic `Badge` default
   (`bg-primary text-primary-foreground`). PendingApproval uses
   `variant="secondary"` with explicit `text-edu-text-primary` for accessible
   contrast on the secondary surface. Both via i18n strings.

### Informational notes (NOT failures — no fix required for this story)

- `[DESIGN-001] info | globals.css @theme | rounded-card`: there is no explicit
  `--radius-card` entry in `@theme` (only `--radius: var(--edu-radius-card)`), so
  the literal `rounded-card` utility resolves to the `--radius` fallback rather
  than a dedicated card token. This is a **pre-existing project-wide convention**
  used identically by already-merged, gate-passed screens
  (`principal-teachers-screen.tsx`); US-E14.2 correctly follows the established
  pattern. Not introduced here — out of scope to fix in this story. Flag to
  `fe-lead` only if a repo-wide `rounded-card` cleanup is desired.

### Accessibility cross-check (gate-relevant)

- Out-of-range error: text + `aria-invalid` + `aria-describedby` (not color
  alone) ✓. Score inputs `min-h-[44px]` (≥44px touch target) ✓. Visible focus
  ring `focus-visible:ring-2 ring-ring`, no bare `outline:none` ✓. Read-only
  cell intent documented with scoped biome-ignore + sticky-header lock notice.

### Impeccable scope compliance

No suggestion to alter palette, tokens, font, or established layout. The design
system remained the source of truth; this gate only verified conformance.
