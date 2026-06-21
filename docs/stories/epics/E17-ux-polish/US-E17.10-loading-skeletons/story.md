# US-E17.10 Loading Skeletons Coverage

## Status

planned

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

Add Storybook screenshot links after implementation.
