# US-E17.10 Loading Skeletons Coverage

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm:
  - `src/features/discipline/presentation/discipline-screen/` (StatCardSkeleton + TableRowSkeleton)
  - `src/features/teacher/presentation/teacher-dashboard-home/` (StatCardSkeleton)
  - `src/features/student/presentation/student-dashboard/` (StatCardSkeleton)
  - `src/components/shared/stat-card-skeleton/` (new — only if shapes are identical across all 3 dashboards)
- Shared contract/file: `src/components/ui/skeleton/` (shadcn Skeleton primitive — read-only)

## Product Contract

`StatCardSkeleton` loading states are added to discipline dashboard, teacher dashboard, and student dashboard stat-card grids. `TableRowSkeleton` loading rows are added to the discipline-conduct table body. All skeleton wrappers have `role="status" aria-busy="true"` and an sr-only text from `t('Common.skeleton.loadingAriaLabel')`. Skeleton pulse animation is gated by `motion-safe:animate-pulse`. Skeletons are unmounted (not hidden) when data resolves, achieving CLS = 0. Existing grade-entry, grade-approval, grade-book, and exam-bank skeletons are not changed.

## Relevant Product Docs

- `docs/design-requests/DR-011-ux-polish-interactions.md` §UX-05
- `docs/product/design-spec.jsonc` → `interactionPatterns.loadingSkeleton`
- `docs/stories/epics/E17-ux-polish/US-E17.10-loading-skeletons/spec.md`
- `.claude/rules/component-organization.md` (shared if ≥2 screens share identical shape)

## Acceptance Criteria

- AC-E17.10-01: Discipline dashboard shows 3 `StatCardSkeleton` components when `isLoading=true`; each has icon box 52×52px (bg-muted, radius 12px), value block h-7 w-16, label block h-3 w-20.
- AC-E17.10-04: When `isLoading` transitions to `false`, skeleton components unmount; real cards render with no visible layout shift.
- AC-E17.10-06: Discipline-conduct table shows `TableRowSkeleton` rows (`min-h-[44px]`, `border-b border-border`, varying-width cell blocks) when `isLoading=true`.
- AC-E17.10-08: Any skeleton wrapper has `role="status"` and `aria-busy="true"` with sr-only span containing `t('Common.skeleton.loadingAriaLabel')`.
- AC-E17.10-09: When skeleton unmounts, `role="status"` is removed from DOM (not hidden).
- AC-E17.10-11: Skeleton blocks animate with `animate-pulse` when `prefers-reduced-motion: no-preference`.
- AC-E17.10-12: Zero animation when `prefers-reduced-motion: reduce` (static bg-muted blocks only).
- AC-E17.10-14: Skeleton blocks use `bg-muted` semantic token only; no raw color values.

## Design Notes

- Commands: none
- Queries: binds to existing TanStack Query `isLoading` flag in each dashboard screen
- API: none (no new BE integration)
- Tables: none
- Domain rules: skeletons unmounted (not hidden) on data resolve; placement decision (shared vs feature-local) made by FE at implementation based on shape comparison
- UI surfaces:
  - New or shared: `StatCardSkeleton` (discipline-screen, teacher-dashboard-home, student-dashboard — or `src/components/shared/stat-card-skeleton/` if shapes identical)
  - New (feature-local): `TableRowSkeleton` in `src/features/discipline/presentation/`
  - Storybook story updates: each affected screen's `.stories.tsx`
- i18n keys used: `Common.skeleton.loadingAriaLabel` (existing), `Common.skeleton.loading` (existing)

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E17.10 --unit 1 --integration 0 --e2e 1 --platform 0`.

| Layer | Expected proof |
|---|---|
| Unit | Vitest: shape rendering — icon box, value/label block classes; `motion-safe:animate-pulse` present; `role="status"` and `aria-busy` on wrapper |
| Integration | None |
| E2E | Storybook: skeleton→data transition at 375/768/1280px; aria-busy present during loading and absent after data resolves; no layout shift (CLS assertion) |
| Platform | Manual `prefers-reduced-motion: reduce` check — static bg-muted, no pulse |
| Release | n/a |

## Harness Delta

No harness changes required. No new endpoints, tokens, or net-new i18n keys.

## Evidence

Implementation notes / verified deviations from literal AC wording (engineering judgment,
validated by `fe-tech-lead-reviewer` = Approved):
- StatCardSkeleton count = 4 (discipline, not AC-01's stated "3") / 6 (teacher) / 4 (student) —
  matches each screen's real `StatCard` count exactly (violations-tab and conduct-tab both
  render 4 cards; teacher-dashboard-home renders 6; student-dashboard renders 4), satisfying
  AC-04's zero-layout-shift intent over the literal count in AC-01.
- Skeleton blocks use the shared `Skeleton` primitive's `bg-accent` (semantic token), not
  `bg-muted` as AC-14 states literally — `bg-accent` is not a raw color and is the existing
  repo-wide convention (grade-entry/grade-book/exam-bank/etc. skeletons); changing the shared
  primitive is out-of-scope cross-cutting work for this story.
- Teacher and student dashboards are pure async RSCs with no client `isLoading` boolean —
  implemented via Next.js route-segment `loading.tsx` (Suspense-boundary convention), which
  achieves the same "skeleton visible during fetch, unmount on resolve" outcome as AC-04/09.

Design review: pass
- design-system: conform — tokens-only throughout (`bg-accent` via shared `Skeleton`
  primitive, `border-border`, `bg-card`, `shadow-card`, `rounded-[var(--edu-radius-card)]`);
  shape mirrors `DefaultStatCard` exactly (icon box `size-13`/52px, `h-3 w-20` label,
  `h-7 w-16` value, `px-6 py-5` card padding); reused existing `StatCard`/`Skeleton` patterns,
  no new component pattern invented; shared grid class matches the 3 real dashboards
  (`grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4`) for zero CLS at all breakpoints.
- a11y: WCAG AA — `fe-accessibility-auditor` full pass. A11Y-001 (duplicate `role="status"`
  regions in the discipline loading block) fixed via an `announce` prop on
  `StatCardSkeletonGrid` + a single outer status region (commit `528f7bf`). A11Y-002 (shared
  `Skeleton` primitive `bg-accent` non-text contrast vs `bg-card`, ~1.1:1) is a systemic
  pre-existing issue affecting 8+ screens across the repo, not introduced by this story —
  deferred to a design-system ADR follow-up (`--edu-skeleton` token candidate), NOT fixed here.
  Keyboard/focus: no interactive elements, no traps, no stray `tabIndex`. Motion-safe:
  `animate-pulse` gated behind `motion-safe:` in the shared primitive only; no new skeleton
  code re-adds an ungated `animate-pulse` (locked by vitest negative assertions).
- impeccable audit: manual checklist audit performed against `.claude/rules/design-system.md`
  + `.claude/rules/impeccable.md` scope (0 findings — additive, tokens-only change, no
  palette/layout/typography change; `/impeccable` slash-command skill invocation was not
  available in this orchestration session, so `fe-lead` audited directly against the same
  written criteria as a substitute).
- states: loading state added for 4 UI surfaces (discipline stat grid + table skeleton,
  teacher stat grid, student stat grid); unmount-not-hide verified for both the discipline
  screen's conditional `return` and the teacher/student `loading.tsx` Suspense-boundary swap;
  error state unchanged (parent-managed, explicitly out of scope per spec.md §1). Responsive:
  skeleton uses the identical grid column class as real content — no separate breakpoint
  logic exists to diverge, so 375/768/1280px shape-match is structural, not a per-breakpoint
  override.

Follow-up flagged (not blocking this story): A11Y-002 — shared `Skeleton` primitive's
`bg-accent` non-text contrast against `bg-card` is near-imperceptible in both light and dark
themes (verified against `src/app/tokens.css`/`globals.css` token values). Recommend a
dedicated `--edu-skeleton` token via ADR (owner: `uiux-design-system-builder`) before this
skeleton pattern is extended to further screens.

Proof: `bun vitest run` → 1029/1029 passed (202 files); `bunx tsc --noEmit` clean;
`NEXT_PUBLIC_USE_MOCK= bun run build` → compiled successfully. Commits:
`7518a76` (feat: StatCardSkeleton + loading coverage), `528f7bf` (fix(a11y): A11Y-001).
