# 0049 — Contrast token reconciliation: muted-foreground retune + dark-mode --edu-* overrides

Date: 2026-07-05

## Status

Accepted

## Context

Across the E17 UX-polish epic (US-E17.4/6/8/9/10/13), the accessibility
auditor flagged the SAME class of WCAG AA contrast failure ≥5 times, each
fixed per-instance:

1. **`text-muted-foreground` fails on light surfaces.** `globals.css` maps
   `--muted-foreground → --edu-text-muted` (`#8898A9`), which is **2.95:1**
   on white (`--edu-card`) — below both the 3:1 icon/UI floor (WCAG 1.4.11)
   and the 4.5:1 small-text floor (WCAG 1.4.3). 115 files use
   `text-muted-foreground`; every audited instance was migrated to
   `text-edu-text-secondary` (`#5A6A85`, **5.48:1**).
2. **`text-destructive` used for text/icons.** `--destructive → --edu-error`
   (`#FA896B`) is ~2.5:1 on white — it is a *background* color (destructive
   buttons with white foreground). The text-safe token already exists:
   `--edu-error-text` (`#C0392B`, decision `0027`). 3 files used the wrong one.
3. **Dark mode never overrides `--edu-*` tokens.** `.dark` overrides the
   shadcn vars (`--card: #131a2e`, `--border: #232b45`, …) but NOT the
   `--edu-*` family, so in dark mode: `bg-edu-card` renders **white** panels
   (US-E17.11 found the grade-table sticky column as a white stripe on a dark
   table), `text-edu-text-primary` (`#2A3547`) is near-invisible on dark
   cards, `text-edu-text-secondary` is ~2.8:1, and `--edu-error-text`
   (`#C0392B`) is ~2.7:1 on `#131a2e`.

Fixing per-instance does not converge: new code keeps reaching for
`text-muted-foreground`/`text-destructive` because they are the idiomatic
shadcn names.

## Decision

Fix at the mapping/root level, not per call site:

1. **Retune light-mode `--muted-foreground` → `var(--edu-text-secondary)`**
   in `globals.css` (`:root` mapping). All 115 consumers become AA-compliant
   in one line. `--edu-text-muted` (`#8898A9`) **remains available** as
   `text-edu-text-muted` for deliberate use on large text (≥18px / 14px bold,
   3:1 floor: 2.95:1 still fails — so effectively decorative/non-essential
   only). Dark-mode `--muted-foreground` (`#8898A9` on `#131a2e` ≈ 5.9:1)
   already passes — unchanged.
2. **Text/icon rule for destructive:** `text-destructive` is banned for
   text/icons on light surfaces; use `text-edu-error-text`. `--destructive`
   stays reserved for backgrounds (`bg-destructive` + white foreground) and
   alpha washes (`bg-destructive/10`). The 3 offending files
   (`components/ui/form/form.tsx`, `components/ui/dropdown-menu/dropdown-menu.tsx`,
   `features/discipline/.../violations-tab.tsx`) are fixed in the same change.
3. **Add minimal `--edu-*` dark-mode overrides** to the `.dark` block in
   `globals.css`, reusing ONLY the existing dark palette values (no new
   colors invented):

   | Token | Dark value | Mirrors |
   | --- | --- | --- |
   | `--edu-bg` | `#0b1020` | `--background` |
   | `--edu-card` | `#131a2e` | `--card` |
   | `--edu-border` | `#232b45` | `--border` |
   | `--edu-text-primary` | `#e5eaf2` | `--foreground` |
   | `--edu-text-secondary` | `#8898a9` | `--muted-foreground` (dark), 5.9:1 |
   | `--edu-text-muted` | `#8898a9` | same (hierarchy collapses to 2 levels in dark, matching the shadcn dark block) |
   | `--edu-error-text` | `var(--edu-error)` | `#FA896B` ≈ 7.6:1 on dark card |

   Status/role/brand tokens (`--edu-primary*`, `--edu-success*`, …) are NOT
   touched — out of scope, audited separately if dark mode gets a full pass.

## Alternatives Considered

1. **Rule-only** (document which token to use, fix on touch) — keeps the
   2.95:1 default live in 115 files; the auditor keeps re-finding it every
   story. Rejected: that is the status quo this ADR exists to end.
2. **Codemod all 115 call sites** to explicit `text-edu-text-secondary` —
   huge diff, needs per-instance judgement (large captions may legitimately
   stay muted), high regression risk. Rejected.
3. **Darken `--edu-text-muted` itself in `tokens.css`** — changes the token's
   meaning everywhere (incl. legit large-text uses) and drifts from the
   handoff palette, which names `#8898A9` as "muted". Rejected; retuning the
   *shadcn alias* keeps the handoff palette intact.

## Consequences

Positive:

- One-line fix makes the default (`text-muted-foreground`) safe — new code is
  AA-compliant without knowing this history.
- Dark mode: `bg-edu-card`/`border-edu-border` panels stop rendering as white
  stripes; `text-edu-text-*`/`text-edu-error-text` become readable.
- The recurring audit finding class is closed at the root.

Tradeoffs:

- Muted text becomes visually darker across the whole light theme
  (`#8898A9 → #5A6A85`) — a deliberate global tone shift, still within the
  handoff palette (it IS the handoff's "text secondary").
- In dark mode, secondary and muted text collapse to one shade (`#8898A9`) —
  matches the existing shadcn dark block, acceptable until a full dark-mode
  design pass.

## Follow-Up

- Sync `docs/product/design-system.md` §Palette + `.claude/rules/design-system.md`
  with the text/icon token rules (done in the same change).
- Future: full dark-mode visual QA pass over status/role tokens (`--edu-success*`,
  `--edu-warning*`, role colors) — separate story.
