# US-E16.4 — Layout-transition perf: ProgressBar fill width% → scaleX (GPU compositing); sidebar width → grid-template-columns

| Field | Value |
|---|---|
| **ID** | US-E16.4 |
| **Epic** | E16 — Impeccable Anti-pattern Fixes (DR-009) |
| **Lane** | normal |
| **Status** | planned |
| **Hard-gate flags** | None — pure CSS animation optimization; no auth/RBAC/token/data-loss/PII |
| **Design authority** | `design_src/edu/ui.jsx` ProgressBar (scaleX pattern) + Sidebar (grid-template-columns); `design_src/edu/announcements.jsx` ProgressTrack; `design_src/edu/assessment.jsx` SchemeEditor; `design_src/edu/gradebook.jsx` SummaryPanel; design-spec.jsonc §layout-transition-perf; `.claude/rules/accessibility.md` (motion-safe) |
| **DR** | DR-009 |

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) touched:
  - `src/features/grades/presentation/grade-approval-screen/components/grade-distribution-chart.tsx:46`
  - `src/features/admin-school-setup/presentation/school-setup-screen/school-setup-screen.tsx:293`
  - `src/features/announcements/presentation/announcements-screen/announcement-card.tsx:114`
  - `src/features/discipline/presentation/student-conduct-screen/components/conduct-summary-card.tsx:107`
  - `src/components/layout/app-shell/sidebar/sidebar.tsx:40`
- Shared contract/file: `src/components/ui/progress/progress.tsx` (if the shadcn Progress primitive also uses `width` — check and fix there first so all consumers get the fix for free)

## Product Contract

### Pattern A — ProgressBar fill: `width: X%` → `transform: scaleX(X/100)` with `transformOrigin: left`

All progress bar FILL elements that currently animate `width` via `transition-[width]` must switch to GPU-composited `transform: scaleX()`:

- BEFORE (each file): fill div has `style={{ width: `${value}%` }}` with `transition-[width]` or `transition: width`
- AFTER: fill div has `style={{ width: '100%', transformOrigin: 'left center', transform: `scaleX(${value / 100})` }}` with `transition: transform 0.6s ease` (or equivalent Tailwind)
- The CONTAINER div stays at 100% width with `overflow: hidden` and the appropriate background color (track color)
- Duration and easing must remain identical to current values (600 ms ease or 500 ms ease — match per-file)
- `motion-safe:` prefix must gate the transition (fall back to no animation for `prefers-reduced-motion: reduce` users)

**Why this matters**: `width` changes trigger Layout (re-flow) + Paint. `transform: scaleX()` runs on the GPU compositor thread — no Layout, no Paint, no main-thread jank. Identical visual result, dramatically better performance on low-powered school devices.

### Pattern B — Sidebar collapse: `transition-[width]` → `transition: grid-template-columns`

The sidebar `<aside>` currently transitions `width` between 72px and 260px (line 40-47 of sidebar.tsx):
```
transition-[width] duration-[250ms] ease-in-out
style={{ width: collapsed ? "var(--edu-sidebar-width-collapsed, 72px)" : "var(--edu-sidebar-width, 260px)" }}
```

This causes a full layout reflow on every frame. The mockup fixes this by wrapping the sidebar in a `display: grid; grid-template-columns: Wpx` container — the grid track width transitions instead of the element width:

- BEFORE: `<aside style={{ width: ... }} className="... transition-[width]">`
- AFTER: outer wrapper `<div style={{ display: 'grid', gridTemplateColumns: `${W}px`, transition: 'grid-template-columns 0.25s ease' }}>` + inner `<aside style={{ minWidth: 0 }}>` that fills the track

The inner `<aside>` has `overflow: hidden` so content collapses as the track shrinks. Duration (250 ms ease-in-out) must remain identical. Visually identical to the user.

Note: `grid-template-columns` transition is a layout-layer property — it is significantly cheaper than `width` on elements with many children (sidebar nav). It is not GPU-composited (only `transform` and `opacity` are compositor-thread), but it avoids the full reflow caused by inline `style.width` change on a positioned element.

**motion-safe gate**: wrap the sidebar transition in `@media (prefers-reduced-motion: no-preference)` — in Tailwind v4 this maps to `motion-safe:transition-[grid-template-columns]`. For `prefers-reduced-motion: reduce` users, the sidebar collapses instantly (no transition).

## Per-file Before / After

### 1. grade-distribution-chart.tsx:46
- BEFORE: `className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500 ${TONE[band.key]}`}` `style={{ width: `${(band.count / max) * 100}%` }}`
- AFTER: Container stays at `w-full` with `overflow-hidden`. Fill div: `className={`h-full w-full rounded-full origin-left ${TONE[band.key]}`}` `style={{ transform: `scaleX(${(band.count / max)})` }}` `className` adds `motion-safe:transition-[transform] motion-safe:duration-500`
- Note: container is the parent div — add `overflow-hidden` if not already present

### 2. school-setup-screen.tsx:293
- BEFORE: `className="h-full rounded-full bg-edu-primary transition-[width] duration-[600ms] motion-reduce:transition-none"` `style={{ width: `${progress.percentComplete}%` }}`
- AFTER: Fill div: `className="h-full w-full origin-left rounded-full bg-edu-primary motion-safe:transition-[transform] motion-safe:duration-[600ms]"` `style={{ transform: `scaleX(${progress.percentComplete / 100})` }}`
- Note: `motion-reduce:transition-none` → replaced by `motion-safe:transition-[transform]` (equivalent: motion-safe shows the transition, reduce gets instant)

### 3. announcement-card.tsx:114
- BEFORE: `className="h-full rounded-full bg-edu-success-text transition-[width] duration-500 motion-reduce:transition-none"` `style={{ width: `${readPct}%` }}`
- AFTER: Fill div: `className="h-full w-full origin-left rounded-full bg-edu-success-text motion-safe:transition-[transform] motion-safe:duration-500"` `style={{ transform: `scaleX(${readPct / 100})` }}`

### 4. conduct-summary-card.tsx:107
- BEFORE: `className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500"` `style={{ width: `${Math.min(100, Math.max(0, points))}%` }}`
- AFTER: Fill div: `className="h-full w-full origin-left rounded-full motion-safe:transition-[transform] motion-safe:duration-500"` `style={{ transform: `scaleX(${Math.min(1, Math.max(0, points / 100))})` }}`
- The color class is driven by the status variant — carry it from the existing className

### 5. sidebar.tsx:40 (collapse transition)
- BEFORE: `<aside ... className="... transition-[width] duration-[250ms] ease-in-out" style={{ width: collapsed ? "var(--edu-sidebar-width-collapsed, 72px)" : "var(--edu-sidebar-width, 260px)" }}>`
- AFTER: Wrap `<aside>` in: `<div style={{ display: 'grid', gridTemplateColumns: `${collapsed ? 72 : 260}px` }} className="motion-safe:transition-[grid-template-columns] motion-safe:duration-[250ms] motion-safe:ease-in-out shrink-0 h-full">`. The `<aside>` inside: remove `transition-[width]` + `style.width`; add `min-w-0 h-full overflow-hidden`.

### 6. shadcn Progress (src/components/ui/progress/progress.tsx) — if applicable
The shadcn `Progress` currently uses `translateX(-${100 - (value || 0)}%)` on the indicator. This is already a `transform`-based approach — but it translates the full-width bar rather than scaling from left. This is equivalent (GPU-composited) but visually equivalent. Evaluate: if the current `translateX` approach is already GPU-composited, NO change is needed here. If the project switches to `scaleX` for consistency with custom bars, update accordingly.

**Decision for FE**: If `progress.tsx` indicator is already `transform`-based via `translateX`, leave it. If not, apply `scaleX` pattern for consistency. Document the decision in the story evidence.

## Acceptance Criteria

> Proof tiers: **S** = Storybook interaction (play()), **U** = Vitest unit, **P** = Playwright.
> Performance ACs are verified at S tier (inspect rendered style) and via Chrome DevTools Performance panel (noted as manual evidence).

### Pattern A — Progress fill scaleX

#### AC-1 — Fill uses transform scaleX, NOT width style (S)
- GIVEN each of the 4 affected progress bars rendered with a non-zero `value`
- WHEN the fill element's computed style is inspected
- THEN `transform` contains `scaleX(N)` where N ∈ (0, 1]
- AND `width` is `100%` (not `X%`)
- AND `transformOrigin` is `left` or `left center`

#### AC-2 — scaleX value maps correctly to percentage (S, U)
- GIVEN a progress bar with `value = 60`
- WHEN rendered
- THEN `transform: scaleX(0.6)` is applied to the fill element (± 0.001 floating point tolerance)
- GIVEN `value = 100`
- THEN `transform: scaleX(1)` (fully filled)
- GIVEN `value = 0`
- THEN `transform: scaleX(0)` (no fill visible)

#### AC-3 — Visual result is identical before and after (S, manual)
- GIVEN the same `value` prop
- WHEN the progress bar renders AFTER the fix
- THEN the FILLED LENGTH appears identical to the BEFORE state at the same value (no visual regression)
- NOTE: scaleX(0.6) on a 100%-width bar fills exactly 60% of the container — mathematically identical to width:60%

#### AC-4 — Transition duration preserved (S)
- GIVEN a progress bar whose value changes from 0 to 75
- WHEN `motion-safe` media query is active
- THEN the fill animates over the same duration as before (600 ms for school-setup, 500 ms for conduct/announcement/distribution)
- AND easing is `ease` or `ease-in-out` (match original per file)

#### AC-5 — motion-safe gate: no transition for prefers-reduced-motion (S, manual)
- GIVEN `@media (prefers-reduced-motion: reduce)` is active (simulated in Storybook)
- WHEN the progress bar value changes
- THEN the fill jumps to the new position instantly (no animated transition)
- AND no `transition-[width]` or `transition-[transform]` runs

#### AC-6 — Progress ARIA preserved after refactor (S)
- GIVEN the fill div changes from `width` to `scaleX`
- WHEN the progress bar renders
- THEN the CONTAINER still has `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` (ARIA is on the container, not the fill — the refactor must not break this)

### Pattern B — Sidebar grid-template-columns transition

#### AC-7 — Sidebar wrapper uses grid-template-columns transition (S)
- GIVEN the `Sidebar` component rendered with `collapsed = false`
- WHEN the DOM is inspected
- THEN an outer wrapper element has `display: grid` and `grid-template-columns: 260px`
- AND the inner `<aside>` does NOT have a `transition-[width]` class

#### AC-8 — Sidebar collapse sets grid track to 72px (S)
- GIVEN the `Sidebar` rendered with `collapsed = true`
- WHEN the DOM is inspected
- THEN the outer wrapper has `grid-template-columns: 72px` (or `var(--edu-sidebar-width-collapsed, 72px)`)

#### AC-9 — Sidebar collapse visual result is identical (S, manual)
- GIVEN the sidebar toggling between expanded (260px) and collapsed (72px)
- WHEN the transition completes
- THEN the sidebar occupies exactly 260px (expanded) or 72px (collapsed) — same as before
- AND nav item labels hide/show at the same breakpoint as before

#### AC-10 — Sidebar collapse duration preserved: 250 ms ease-in-out (S, manual)
- GIVEN `motion-safe` media query is active
- WHEN the sidebar collapse/expand toggle is triggered
- THEN the track transition takes ~250 ms with ease-in-out easing
- AND this is visually equivalent to the previous `width` transition at the same spec

#### AC-11 — Sidebar collapse instant for prefers-reduced-motion (S, manual)
- GIVEN `@media (prefers-reduced-motion: reduce)` is active
- WHEN the sidebar collapse/expand toggle is triggered
- THEN the sidebar transitions instantly (no animated duration)

#### AC-12 — Sidebar collapse toggle remains functional (S)
- GIVEN the sidebar rendered in Storybook with `onToggle` prop
- WHEN the collapse button is clicked
- THEN the sidebar transitions from expanded → collapsed (or vice versa)
- AND the `ChevronLeft` icon rotates 180° on collapse (existing behavior preserved)

### General gates

#### AC-13 — No `transition-[width]` on fill elements after fix (build review)
- GIVEN the diff for this story
- WHEN reviewed by `fe-tech-lead-reviewer`
- THEN no occurrence of `transition-[width]` or `transition: width` remains on a FILL element (progress bar inner div)
- AND `transition-[width]` on the sidebar's outer wrapper is REPLACED by `transition-[grid-template-columns]`

#### AC-14 — GPU property only on fill (design contract)
- GIVEN the fill element uses `transform: scaleX()`
- THEN only `transform` and `opacity` are animated on that element — no `width`, `height`, `left`, `top`, or other layout properties
- AND `will-change: transform` MAY be added if the FE team deems necessary (not mandatory)

#### AC-15 — Biome lint + tsc clean (platform)
- GIVEN all 5 file changes
- WHEN `bun lint` and `bunx tsc --noEmit` run
- THEN zero errors

#### AC-16 — Full test suite unchanged (U)
- GIVEN all changes
- WHEN `bun vitest run` executes
- THEN all previously-passing tests continue to pass

## i18n Requirements

No new user-facing copy. No new i18n keys required. This story is purely a CSS/animation optimization.

## Design Notes

- `scaleX(N)` where N = value/100 is mathematically equivalent to `width: N%` for a 100%-wide fill — no visual difference at any value
- `transformOrigin: 'left center'` (or Tailwind `origin-left`) is required; without it `scaleX` scales from the center and would look wrong
- The shadcn Progress indicator uses `translateX(-${100 - value}%)` — this is already GPU-composited; evaluate whether to leave as-is or normalize to scaleX for consistency
- `grid-template-columns` transition: W3C spec allows CSS transitions on `grid-template-columns` in modern browsers (Chrome 75+, Firefox 67+, Safari 16.4+). School environment: verify browser matrix if needed (school devices may run older Chromium via Chromebook — Chromium 75+ supports grid transitions)

## Validation

`scripts/bin/harness-cli story update --id US-E16.4 --status implemented --unit 0 --integration 0 --e2e 1 --platform 1`

| Layer | Expected proof |
| --- | --- |
| Unit | None required (pure CSS change) |
| Integration | None required |
| E2E | Storybook: ProgressBar stories (inspect scaleX in play()); Sidebar story (inspect grid-template-columns); motion-safe toggle in Storybook |
| Platform | `bun build` + `bunx tsc --noEmit` clean; Chrome DevTools Performance panel flamechart shows no Layout/Paint on progress fill animation (manual evidence, add to story evidence section) |

## Harness Delta

- TEST_MATRIX row US-E16.4: `planned` → `implemented` after gate-green
- No ADR (optimization only; no design-system token change)

## Evidence

Add after implementation: before/after Chrome DevTools flamechart showing Layout/Paint elimination on progress fill. Storybook story screenshots at value=0, 50, 100 for each bar.
