# US-E07.4 StatusBadge Shared Component — Extract Inline Badge Patterns

## Status

in-progress

## Lane

normal

## Dependencies

- Depends on: US-E07.3 (none blocking — independent, but do sequentially per request)
- Blocks: none
- Feature module(s) chạm: `src/components/shared/status-badge/` (new), `src/features/teacher/presentation/`, `src/features/user/presentation/profile/`
- Shared contract/file: `components/ui/badge` (wrapped, not modified)

## Product Contract

Follow-up of decision 0026 (component-placement-canonical). Status-badge styling repeated inline in multiple screens:
- `teacher-dashboard.tsx`: `STATUS_TONE` map → `Badge className={cn("border-0", STATUS_TONE[p.status])}` for schedule period status (done/live/upcoming).
- `profile-screen.tsx`: `Badge className="mt-1 border-0 bg-primary/12 text-primary"` for role badge.

Goal: create `components/shared/status-badge/StatusBadge` wrapping `Badge` ui primitive with a `tone` prop that maps to `bg = color/18` per design-system.md §Badge patterns. Replace inline badge patterns in teacher-dashboard and profile-screen with `StatusBadge`. 

Note: `calendar-screen.tsx` is in-flight (feat/us-e12.2-academic-calendar) — its `bg-edu-success/[0.18]` active year badge is a different semantic pattern (not a status map) and is deferred to avoid merge conflict.

## Acceptance Criteria

- `StatusBadge` component in `components/shared/status-badge/` wraps `Badge` ui primitive.
- Accepts `tone` prop: `"primary" | "success" | "warning" | "error" | "info" | "purple" | "teal" | "muted"`.
- Each tone renders `bg = color/18` + matching `text-color` per design-system.md §Badge patterns.
- Accepts `className` override and all valid `Badge` props (forwarded).
- `TeacherDashboard` replaces inline `Badge className={cn("border-0", STATUS_TONE[...])}` with `StatusBadge tone={...}`.
- `ProfileScreen` replaces inline `Badge className="mt-1 border-0 bg-primary/12 text-primary"` with `StatusBadge tone="primary"`.
- Status is not conveyed by color alone — label text remains present (pre-existing, no regression).
- Storybook stories cover all tones + custom className override.
- All tests pass; `tsc --noEmit` clean; `bun build` green.
- i18n keys unchanged.

## Design Notes

- Commands: none
- Queries: none
- API: none
- Domain rules: none
- UI surfaces: `teacher-dashboard.tsx`, `profile-screen.tsx`, new `status-badge.tsx` + stories

### Tone → class mapping (from design-system.md §Badge + §Palette):
- `primary` → `bg-primary/15 text-primary`
- `success` → `bg-edu-success/15 text-edu-success`
- `warning` → `bg-edu-warning/15 text-edu-warning-foreground` (warning-foreground not white per a11y)
- `error` → `bg-edu-error/15 text-edu-error`
- `info` → `bg-edu-info/15 text-edu-info`
- `purple` → `bg-edu-purple/15 text-edu-purple`
- `teal` → `bg-edu-teal/15 text-edu-teal`
- `muted` → `bg-muted text-muted-foreground`

teacher-dashboard STATUS_TONE mapping:
- `done` → tone `"muted"`
- `live` → tone `"success"`
- `upcoming` → tone `"warning"`

profile-screen role badge → tone `"primary"` (plus `mt-1` margin via className)

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Vitest: StatusBadge renders correct classes per tone |
| Integration | n/a — pure UI |
| E2E | Storybook: all tone variants; teacher-dashboard + profile stories still green |
| Platform | tsc --noEmit clean, bun build green |

## Harness Delta

- Story US-E07.4 registered via harness-cli.
- TEST_MATRIX row added: US-E07.4.
