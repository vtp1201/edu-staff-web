# Design Review — US-E09.1 Discipline Screen

Gate per `docs/DESIGN_REVIEW.md`. Scope: discipline-screen presentation
(`discipline-screen.tsx`, `violations-tab`, `conduct-tab`, `leave-tab`,
`reject-leave-dialog`, `conduct-badge`) + supporting `discipline-tones.ts`,
`discipline-avatar.tsx`, `discipline-screen.stories.tsx`.

Date: 2026-06-17 · Reviewer: fe-nextjs-engineer

---

## 1. Design system conformance

- [x] **Tokens-only, no raw color.** All colors use semantic / `edu-*` tokens:
  `text-foreground`, `text-edu-text-secondary/-muted`, `bg-card`,
  `border-border`, `bg-primary/15`, `bg-edu-error/10`, `text-edu-error-text`,
  `text-edu-success`, `text-edu-success-text`, `bg-edu-warning`,
  `bg-edu-error-dark` / `text-edu-error-dark` / `bg-edu-error-dark-light`
  (ADR 0040 "Nặng" severity), `text-edu-warning-foreground`. No `#hex`,
  `slate-*`, `gray-*`, or `bg-[...]` arbitrary colors found.
- [x] **Radius/shadow per scale.** Cards use `rounded-[var(--edu-radius-card)]` +
  `shadow-card`; badges via `StatusBadge` (full radius). Status accent bars
  `w-1` left bar colored by token — matches class-log `listRow.statusBar`
  pattern in design-spec.
- [x] **Reuse, no re-invention.** `StatCard` (default + `compact` variant),
  `StatusBadge`, `Progress`, shadcn `Tabs/Table/Dialog/Select/Switch/Textarea`
  all reused from canonical homes. No forked stat card / inline badge styling —
  status tones centralized in `discipline-tones.ts` (one source) and rendered
  through `StatusBadge`, satisfying `component-organization.md` (decision 0026).
  `ConductBadge` is a thin typed wrapper over `StatusBadge` (acceptable — adds
  grade→tone typing, no duplicate styling). `DisciplineAvatar` is a feature-local
  composed tone wrapper over the `Avatar` primitive (single-screen; correct
  placement, promote on 2nd use).
- [x] **High-severity treatment.** `high` ("Nặng") uses the dedicated
  `edu-error-dark` token via `HIGH_SEVERITY_BADGE_CLASS` rather than forking a
  new badge component — correctly extends the shared pattern with a class, per
  ADR 0040. Documented rationale present in `discipline-tones.ts`.
- [x] **Role variants color/permission only.** `viewerRole` gates the
  teacher-only record form/`Nhập vi phạm mới` button; principal sees read views.
  No tone fork (decision 0013) — same layout, capability-gated UI.
- [x] **Matches screen inventory.** Three tabs (Violations / Conduct / Leave)
  match design-spec `discipline.tabs`; conduct grade tones map to
  `conductThresholds` (Tốt≥90 success, Khá≥70 primary, TB≥50 warning, Yếu poor)
  via `CONDUCT_GRADE_TONE` + `pointsColorClass`. Violation types/severities
  match `design_src/edu/discipline.jsx` config.

## 2. Accessibility (WCAG 2.1 AA)

- [x] **Contrast.** Text colors use AA-compliant tokens: `edu-error-text`
  (5.1:1), `edu-success-text` (5.4:1), `edu-warning-foreground` (#2A3547),
  `edu-error-dark` (8.2:1 on white). `StatusBadge` tones are AA-aware by
  construction (decision 0027). No white-on-yellow.
- [x] **Status not color-only.** Every status carries a text label
  (`StatusBadge` children) and most carry an icon (tab icons, stat icons, leave
  status icons, empty-state check). Left accent bars are `aria-hidden` decoration
  layered on top of the labeled badge — color is redundant, not sole carrier.
- [x] **Keyboard / focus / Radix semantics.** Built on Radix shadcn primitives
  (Tabs, Dialog, Select, Switch) — roving focus, ESC-to-close, focus trap
  preserved; no `outline:none`. Filter/severity buttons use real `<button>` with
  `aria-pressed` reflecting toggle state.
- [x] **Labels & error semantics.** Every input has a linked `<label>`
  (`htmlFor`/`id`): violation form fields, override note (`sr-only` label),
  reject reason. Severity group uses `<fieldset>`/`<legend>`. Reject dialog wires
  `aria-required`, `aria-invalid`, and `aria-describedby` → error text node
  (text + ARIA, not color alone). `role="alert"` on load-error and
  rejection-reason callouts.
- [x] **Icon-only buttons labeled.** Cancel-edit (`X`) has `aria-label`
  `t("cancelEdit")`; conduct edit, leave approve/reject have descriptive
  per-student `aria-label`s. Decorative icons are `aria-hidden`. Progress bar has
  `aria-label` with student + points.
- [x] **Touch targets.** Action buttons use shadcn `size="sm"` (h-8 = 32px) in
  dense table/list rows — below the 44px mobile guideline. See Finding A11Y-N1
  (note, not blocker — consistent with existing dense list/table screens that
  passed gate; flagged for the shared `sm` decision rather than fixed here).
- [x] **Reduced motion.** No bespoke animations introduced; only token
  transitions (`Progress` fill, shadcn primitives) which inherit the
  motion-safe baseline. No autoplay.

## 3. impeccable critique

- [~] `/impeccable audit` / `/impeccable critique` **not run as a CLI in this
  pass** — per `.claude/rules/impeccable.md` the skill is `user-invocable`
  (`/impeccable …`) and not callable from the agent runtime here. Manual audit
  against the same checklist (contrast, spacing rhythm, hierarchy, UX writing,
  state coverage) performed below in lieu. No anti-patterns found that the design
  system does not already arbitrate.
- [x] **Spacing rhythm consistent.** Cards `p-6`, list/table header
  `px-5 py-3.5`, rows `px-5 py-3.5`/`py-4`, stat grid `gap-3.5`, section stacks
  `gap-5/gap-6`, field stacks `gap-1.5`. Coherent and on the token scale.
- [x] **Hierarchy.** Page title `text-2xl/extrabold` → section `text-sm/bold` →
  body/caption `text-xs` muted. Stat values via `StatCard`. Clear and consistent.
- [x] **UX writing.** All copy goes through i18n (`discipline.*` namespace, vi+en
  present); empty states are friendly/positive ("no violations" with success
  check), errors actionable with a retry affordance.

## 4. States & responsive

- [x] **All async states present.** Screen-level `isLoading` skeleton (stat grid
  + body), `loadErrorKey` alert with optional `onRetry`, success content.
  Per-tab empty states (violations & leave: success-styled empty; conduct table
  renders empty body gracefully). Optimistic mutations with `toast` success +
  `toast.error(tErr(errorKey))` on action failure — error keys translated at
  presentation only (i18n rule honored; actions return stable `errorKey`).
- [x] **Responsive.** Stat grids `grid-cols-2 lg:grid-cols-4` /
  `grid-cols-1 sm:grid-cols-3`; form grids collapse `sm:grid-cols-2/3`; header
  toolbars `flex-wrap`. Conduct uses a `Table` inside `overflow-hidden` card —
  horizontal overflow on the table container is the standard pattern; no layout
  break at 320px (no fixed min-widths beyond small `w-15`/`w-32` controls).
  Padding `p-6 sm:p-8`.
- [x] **Storybook story states.** `discipline-screen.stories.tsx` covers
  Loading, ErrorState (+retry), ViolationsTab Teacher/Principal/Empty, ConductTab,
  LeaveTab WithPending/Reject(dialog flow)/Empty — interaction `play` fns assert
  role-gating and empty/error rendering. Strong coverage.

## Findings

| ID | Severity | File | Finding | Fix |
|----|----------|------|---------|-----|
| A11Y-N1 | Note | violations-tab / conduct-tab / leave-tab | Dense-row action buttons use `size="sm"` (≈32px height), under the 44px mobile touch-target guideline. | Consistent with prior gate-passed dense list/table screens; not a regression. Recommend resolving globally via the shared `Button sm` sizing decision rather than per-screen here. Track as cross-cutting follow-up. |
| DS-N2 | Note | conduct-tab | `text-edu-warning-foreground` (#2A3547) used as the "some absences" emphasis color is a near-neutral dark, so the warning signal leans on the number value + the parallel red for ">3". | Acceptable — value is also labeled by column header; matches a11y rule (no white-on-yellow). No change required. |

No High/Medium findings. No raw-color, no token violations, no missing-state,
no broken-ARIA issues.

## Verdict

**PASS_WITH_NOTES**

Design-system conformance, a11y, state coverage, and responsive behavior all
pass. Two informational notes (A11Y-N1 dense-row touch target — a known
cross-cutting `Button sm` matter, not a US-E09.1 regression; DS-N2 cosmetic) are
recorded as follow-ups and do **not** block closing the story. No palette/token/
font/layout changes proposed (impeccable scope respected — design system is
authoritative).

### Evidence (for story `## Evidence`)

```text
Design review: pass (with notes)
- design-system: conform (tokens-only; StatCard/StatusBadge/Progress/tones reused; ADR 0040 high-severity via class, no fork)
- a11y: WCAG AA OK (AA text tokens, labels+aria-invalid/describedby, role=alert, icon aria-labels, Radix semantics); reduced-motion OK
- impeccable: CLI not runtime-invocable; manual audit vs checklist — 0 anti-patterns design-system doesn't already arbitrate
- states: loading/empty/error/success OK; responsive sm→lg + 320px OK; stories cover all states + interaction play fns
- notes: A11Y-N1 (sm-button touch target — cross-cutting follow-up), DS-N2 (cosmetic) — non-blocking
- tsc --noEmit clean; biome check clean on src/features/discipline/presentation
```
