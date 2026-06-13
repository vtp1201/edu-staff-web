# US-E07.2 Accessible Primary Token (Contrast Fix)

## Status

planned

## Lane

normal

## Product Contract

The `--primary` CSS variable (and `bg-primary`/`text-primary-foreground` classes)
must achieve ≥4.5:1 contrast ratio (WCAG 2.1 SC 1.4.3 AA) for normal text across
all screens. Currently `--edu-primary` (#5D87FF) on white text achieves only 3.29:1.

The fix: remap `--primary` → `--edu-primary-dark` (#4570EA) which achieves 4.56:1.
This change must propagate globally without touching any feature-specific code
(pure token change in `globals.css`). The edu-prefix token `--edu-primary` stays
untouched (per-tenant override target, decision 0007); only the shadcn semantic
variable `--primary` is updated.

## Relevant Product Docs

- `src/app/tokens.css` — runtime token source of truth
- `src/app/globals.css` — `@theme` + `:root` / `.dark` semantic mapping
- `docs/product/design-system.md` — product design contract
- `docs/decisions/0023-primary-button-contrast-token.md` — ADR tracking this issue (A11Y-005)
- `.claude/rules/design-system.md`, `.claude/rules/accessibility.md`

## Acceptance Criteria

- AC1: White (#FFFFFF) on `--primary` achieves ≥4.5:1 contrast ratio (WCAG 2.1 SC 1.4.3 AA).
- AC2: `--primary` remapped to `var(--edu-primary-dark)` (#4570EA) in both `:root` and `.dark` in `globals.css`.
- AC3: `docs/product/design-system.md` updated to document the accessible primary shade.
- AC4: ADR 0023 updated from Proposed → Accepted with verified contrast ratio.
- AC5: `tsc --noEmit` passes with no new errors.
- AC6: `bun build` succeeds.
- AC7: `/impeccable audit` reports no primary contrast regression on Login, Dashboard, primary button usage.
- AC8: No raw colors introduced; no tailwind.config.ts touched.
- AC9: Dark mode `--primary` also remapped (same `--edu-primary-dark` value maintains contrast on dark backgrounds).

## Design Notes

- Token change: in `globals.css` `:root` block, change `--primary: var(--edu-primary)` → `--primary: var(--edu-primary-dark)`.
- Also update `.dark` block: same change.
- Also update `--sidebar-primary` and `--ring` which both reference `--edu-primary` directly — evaluate if they should also use `--edu-primary-dark` for consistency. Sidebar active state and ring are UI-chrome (not text-on-color), so 3:1 threshold applies — `--edu-primary` (3.29:1 on white) barely fails 3:1 on light background. Safer to remap these too.
- Commands: CSS variable change only — no TypeScript, no components.
- Queries: n/a
- API: n/a
- Tables: n/a
- Domain rules: n/a
- UI surfaces: all screens using `bg-primary`, `text-primary`, `bg-sidebar-primary`, `border-ring` — no component code changes needed (token propagates automatically).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | No unit tests needed — pure CSS token change with no logic. |
| Integration | n/a |
| E2E | Manual/impeccable sweep: Login, Dashboard, primary buttons, sidebar active state, ring focus — verify no visual regression. |
| Platform | `tsc --noEmit` + `bun build` green. |
| Release | `/impeccable audit` verdict + design-review gate pass. |

## Harness Delta

- Story registered: `US-E07.2` added to backlog.
- ADR 0023 updated: Proposed → Accepted.
- `docs/product/design-system.md` sync required.

## Evidence

_To be filled after implementation._
