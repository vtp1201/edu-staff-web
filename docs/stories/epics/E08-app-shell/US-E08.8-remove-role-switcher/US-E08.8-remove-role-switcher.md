# US-E08.8 Remove RoleSwitcher from the header

## Status

planned

## Lane

tiny

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/components/layout/app-shell/` (header +
  app-shell composition only — Sidebar untouched)
- Shared contract/file: `src/bootstrap/i18n/messages/{vi,en}.json` namespace
  `shell.header` (removing `switchRole` key only — `shell.roles.*` stays,
  used by `tenant-card`, `role-select`, `invite-redeem`)

> Concurrent note: another `/fe` session is in-flight on
> `feat/us-e08.7-student-schedule-nav-label` touching `nav-config.ts` +
> unrelated messages keys (sidebar label). No file overlap with this US
> (header/role-switcher vs sidebar nav-config) — verified independent.

## Product Contract

The header's "Học sinh ⌄" pill (`RoleSwitcher`,
`src/components/layout/app-shell/header/role-switcher.tsx`) is a mock-era
control that let a user change their effective role client-side by picking
from a hardcoded `availableRoles` list. Role is now a property of the
authenticated session (token/membership), and switching role/tenant already
has a real, correct flow: the "Đổi trường" (switch-tenant) dialog in the
user-menu dropdown (US-E23.1, `TenantSwitchDialog`), which redirects through
a Server Action against real membership data. The header pill duplicates that
concept with fake data and no real effect beyond a client-side route push —
it must be removed.

Per `docs/product/design-spec.jsonc` `app-shell.header` entry (height,
background, borderBottom, search, notificationBell only — **no roleSwitcher/
role-badge element specified for the header bar itself**), removing the pill
with no replacement matches the canonical spec exactly; nothing needs to be
added back into the header bar. The current role is still visible where the
design spec DOES place it — the `StatusBadge` role tone next to the tenant
name inside the user-menu dropdown (`header.tsx` `currentMembership` block,
already shipped in US-E23.1) — so "current role visibility" is not lost, just
no longer duplicated in two places.

## Relevant Product Docs

- `docs/product/design-spec.jsonc` → `app-shell.header` (line ~108)
- US-E23.1 packet (real switch-tenant flow this control was scooped by)

## Acceptance Criteria

- `RoleSwitcher` component file deleted; no remaining import/reference to it
  anywhere in `src/`.
- `Header` no longer renders the pill; `onRoleChange` prop removed from
  `HeaderProps` and from the JSX.
- `AppShell` no longer threads a role-switch callback: `handleRoleChange` and
  the `useState`-based `role`/`setRole` are removed — `role` becomes a plain
  derivation of the `initialRole` prop passed in (no client-side role
  mutation exists anymore in the shell).
- i18n key `shell.header.switchRole` removed from BOTH `vi.json` and
  `en.json` (confirmed unused anywhere else first). `shell.roles.*` namespace
  is NOT touched (still used by `tenant-card`, `role-select`,
  `invite-redeem`).
- `header.stories.tsx` continues to pass unmodified in spirit (no story
  exercised the switcher's play function) — verify existing stories still
  green; no new story needed for a removed control.
- `app-shell.test.tsx` / `header.test.ts` still green; no test referenced
  `RoleSwitcher`/`onRoleChange` before this change (verified during intake) —
  if any hidden reference surfaces during implementation, remove/update it.
- No other screen imports `RoleSwitcher` (verified during intake — only
  `header.tsx` did).
- Design-review gate: `/impeccable audit` on the header confirms no visual
  regression vs the canonical `app-shell.header` spec (no role element
  expected there).

## Design Notes

- Commands: none (pure UI/prop-drilling removal, no new Server Action/DI).
- Queries: none.
- API: none.
- Tables: n/a.
- Domain rules: none — no domain/infrastructure layer touched.
- UI surfaces: `Header` (`src/components/layout/app-shell/header/header.tsx`),
  `AppShell` (`src/components/layout/app-shell/app-shell.tsx`). Delete
  `role-switcher.tsx`.

## Validation

`scripts/bin/harness-cli story update --id US-E08.8 --status implemented --unit 1 --integration 0 --e2e 0 --platform 0`

| Layer | Expected proof |
| --- | --- |
| Unit | none new (pure deletion) — existing `header.test.ts` stays green |
| Integration | n/a |
| E2E | existing `header.stories.tsx` interaction stories stay green (regression proof — nothing exercised the switcher, so removing it must not break `MultiTenant`/`SingleTenantZeroNoise`/etc.) |
| Platform | n/a |
| Release | design-review gate (`/impeccable audit` + this packet's AC) |

## Harness Delta

- `story add --id US-E08.8 --lane tiny`

## Evidence

Implemented 2026-08-08 on `feat/us-e08.8-remove-role-switcher` (worktree
`../edu-staff-web-trees/us-e08.8`).

### Changes

- **Deleted** `src/components/layout/app-shell/header/role-switcher.tsx`.
- `header/header.tsx` — removed the `RoleSwitcher` import, the `onRoleChange`
  prop (from `HeaderProps` + destructuring), and the `<RoleSwitcher …/>` JSX.
  Also removed the now-dead pill inside `HeaderPlaceholder` (the outline
  `Button` with the muted dot + `···`): it existed **only** as the pre-mount
  SSR stand-in reserving the switcher's width, so keeping it would have left a
  phantom pill that flashes and then disappears on hydration — a layout shift
  for a control that no longer exists. It was `aria-hidden`/`tabIndex={-1}`
  decorative, referenced by nothing, and the bell/theme/avatar placeholders are
  untouched.
- `app-shell.tsx` — removed `handleRoleChange` and the `useState`-based
  `role`/`setRole`; `role` is now a plain derivation of the `initialRole` prop
  (public prop name `role` unchanged). Removed `onRoleChange` from `<Header>`.
  `Role` type import, `tenantUrl`, `router`, `useState` (mobile nav) all still
  needed and kept.
- i18n — removed `shell.header.switchRole` from BOTH `vi.json`
  ("Chuyển vai trò") and `en.json` ("Switch role"). `shell.roles.*` untouched
  (still used by `tenant-card`, `role-select`, `invite-redeem-screen`).

Re-verified by grep: no `RoleSwitcher` / `role-switcher` / `switchRole`
reference remains anywhere in `src/` (remaining hits are historical story
packets/ADRs under `docs/`, left as-is as a historical record). No test or
story referenced the switcher, `onRoleChange`, or the placeholder pill.

### Proof (all run in the worktree, 2026-08-08)

TDD note: pure deletion with no new behavior → no new "red" test exists to
write; the proof is the existing suite staying green (regression proof).

| Command | Result |
| --- | --- |
| `bunx tsc --noEmit` | ✅ clean (no output) |
| `bun vitest run src/components/layout/app-shell/` | ✅ 7 files / 49 tests passed (incl. `header.test.ts`, `app-shell.test.tsx`) |
| `bun vitest run --config vitest.storybook.mts src/components/layout/app-shell/header/header.stories.tsx` | ✅ 1 file / 6 tests passed (`Teacher`, `Student`, `MultiTenant`, `MultiTenant_CloseRestoresFocus`, `SingleTenantZeroNoise`, `FetchFailZeroNoise`) |
| `bun vitest run` (full suite) | ✅ 519 files / 4119 tests passed |
| `bunx biome check src/components/layout/app-shell/ src/bootstrap/i18n/messages/{vi,en}.json` | ✅ 21 files checked, 0 diagnostics |
| `bun lint` (repo-wide) | ✅ no errors — 1 pre-existing warning in `features/messaging/.../message-context-menu.tsx` (unused suppression), untouched by this US |

`bun build` + design-review gate + merge: owned by `fe-lead`.
