# US-E07.3 StatCard Variants — Merge Stat + ChildStat into shared StatCard

## Status

in-progress

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/components/shared/stat-card/`, `src/features/attendance/presentation/attendance-screen/`, `src/features/parent/presentation/`
- Shared contract/file: `components/shared/stat-card/stat-card.tsx` (extending props, no breaking change)

## Product Contract

Follow-up of decision 0026 (component-placement-canonical). Three divergent "stat card" components exist:
1. `components/shared/stat-card/StatCard` — canonical (icon 52×52, value 26px/800, optional trend).
2. `Stat` local in `attendance-summary-card.tsx` — compact, no icon, label/value/tone only.
3. `ChildStat` local in `parent-dashboard.tsx` — mini inline icon + value + label, inside a card grid.

Goal: extend `StatCard` with `variant="default" | "compact" | "mini"` and optional `icon` prop (already present in default; optional in compact; required in mini as ReactNode). Delete `Stat` and `ChildStat`. Both consumers use `StatCard` from shared. Visual/behavior must be pixel-identical to what existed before.

## Acceptance Criteria

- `StatCard` accepts `variant` prop: `"default"` (current behavior), `"compact"` (no icon, horizontal label+value, tone-colored value), `"mini"` (small centered icon+value+label, inside rounded box).
- `StatCard variant="default"` keeps all existing props/behavior unchanged — existing stories pass.
- `AttendanceSummaryCard` uses `StatCard variant="compact"` from `@/components/shared/stat-card`; local `Stat` function removed.
- `ParentDashboard` uses `StatCard variant="mini"` from `@/components/shared/stat-card`; local `ChildStat` function removed.
- Visual output identical to pre-refactor for all three use-cases (no spacing/color/size regression).
- Storybook stories cover all three variants (including Compact and Mini).
- All tests pass; `tsc --noEmit` clean; `bun build` green.
- i18n keys unchanged (no UI string modifications).

## Design Notes

- Commands: none (pure refactor — no server state)
- Queries: none
- API: none
- Domain rules: none
- UI surfaces: `attendance-summary-card.tsx`, `parent-dashboard.tsx`, `stat-card.tsx` + stories

### compact variant spec (from Stat component):
- Wraps `Card > CardContent` (p-4)
- `text-xs text-muted-foreground` label
- `mt-1 text-2xl font-semibold` value, tone-colored (success/error/primary/foreground)
- Tone mapping: success → `text-edu-success`, error → `text-edu-error`, primary → `text-primary`, default → `text-foreground`

### mini variant spec (from ChildStat component):
- Rounded box `rounded-[var(--edu-radius-btn)] bg-muted/50 p-2`
- Centered `icon` (React.ReactNode — caller passes sized/colored icon)
- `mt-1 text-sm font-bold text-foreground` value
- `text-[10px] text-muted-foreground` label below

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Vitest: StatCard variant rendering (compact tone mapping, mini structure) |
| Integration | n/a — pure UI component |
| E2E | Storybook: Compact + Mini stories; existing Default stories still green |
| Platform | tsc --noEmit clean, bun build green |

## Harness Delta

- Story US-E07.3 registered via harness-cli.
- TEST_MATRIX row added: US-E07.3.
