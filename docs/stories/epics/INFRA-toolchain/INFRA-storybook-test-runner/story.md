# INFRA-storybook-test-runner: Fix Storybook Interaction-Test Runner (ERR_REQUIRE_ESM)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none (unblocks E2E/interaction proof tier across whole repo)
- Feature module(s) chạm: none (toolchain config only)
- Shared contract/file: `package.json`, `vitest.storybook.mts`, `.storybook/`

## Product Contract

The Storybook interaction-test runner (`bun run vitest:storybook`) must execute `play()` functions
without throwing `ERR_REQUIRE_ESM`. Stories with `play()` fns (e.g. US-E12.4 roster — 6 stories)
must run and report pass/fail correctly via `@vitest/browser-playwright`.

## Root Cause

`vite-plugin-storybook-nextjs@3.3.0` ships a CJS build (`dist/index.cjs`) that calls
`require("vite-tsconfig-paths")`. However, `vite-tsconfig-paths@5.x` is ESM-only
(`"type": "module"`), so Node.js throws `ERR_REQUIRE_ESM` when the CJS entry is loaded.

Load path: `@storybook/nextjs-vite/dist/preset.js` line 1947 uses `createRequire(import.meta.url)`
to load `vite-plugin-storybook-nextjs` → forces the `.cjs` export → which `require()`s
`vite-tsconfig-paths` → throws.

## Fix

Add a bun `overrides` block in `package.json` pinning `vite-tsconfig-paths` to `^4.3.2`
(the latest v4, `"type": "cjs"` — no `"type": "module"` field, so `require()` succeeds).
`vite-plugin-storybook-nextjs@3.3.0` declares `"vite-tsconfig-paths": "^5.1.4"` in its
dependencies, but v4.3.2 is API-compatible for the usage in this plugin. The override scopes
this to the subtree so the rest of the project's vite ecosystem is unaffected.

ADR: 0032 (toolchain override — ESM/CJS interop)

## Acceptance Criteria

- `bun run vitest:storybook` exits 0; `play()` functions execute without `ERR_REQUIRE_ESM`.
- Storybook interaction tests for US-E12.4 roster (6 stories) all pass.
- `bun vitest run` (full unit/integration suite) remains green.
- `tsc --noEmit` reports 0 errors.
- `bun build` succeeds.

## Design Notes

- No product code changed. Toolchain config only.
- The override is the minimal targeted fix — does not upgrade any Storybook or Vitest package.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a (no domain logic) |
| Integration | n/a |
| E2E | Storybook interaction runner executes US-E12.4 `play()` fns without error |
| Platform | `tsc --noEmit` + `bun build` green |
| Release | — |

## Harness Delta

- New story registered: `INFRA-storybook-test-runner` (planned → implemented)
- TEST_MATRIX row added
- ADR 0032 added

## Evidence

- 110/110 Storybook interaction tests pass (`bun run vitest:storybook`), 44 story files
- 194/194 unit tests pass (`bun vitest run`)
- `tsc --noEmit` — 0 errors
- `bun run build` (Next.js) — green
- US-E12.4 roster: all 6 `play()` interaction stories pass (EmptyClass, Populated, TransferWarning, BulkSelected, ErrorState, Loading)
- ERR_REQUIRE_ESM unblocked for entire repo (was blocking all play() fns env-wide)

### Changes

| File | Change |
| --- | --- |
| `patches/@storybook%2Fnextjs-vite@10.4.2.patch` | bun patch: preset.js — dynamic import() instead of synchronous require() |
| `postcss.config.js` | Renamed from `.mjs`, converted to CJS module.exports |
| `postcss.config.mjs` | Deleted (replaced by `.js`) |
| `src/features/admin-roster/presentation/student-roster-screen/student-roster-screen.stories.tsx` | Added `parameters.nextjs.appDirectory: true` |
| `src/features/attendance/presentation/attendance-screen/attendance-screen.stories.tsx` | Added `parameters.nextjs.appDirectory: true` |
| `src/features/admin-school-setup/presentation/school-setup-screen/school-setup-screen.stories.tsx` | Import fix (`@storybook/nextjs-vite`), added `NextIntlClientProvider` decorator + `nextjs.appDirectory: true` |
| `src/features/admin/subject-catalogue/presentation/subject-departments-screen/subject-departments-screen.stories.tsx` | Import fix, added `NextIntlClientProvider` decorator |
| `src/features/admin/subject-catalogue/presentation/subjects-screen/subjects-screen.stories.tsx` | Import fix, added `NextIntlClientProvider` decorator |
| `src/features/admin/calendar/presentation/calendar-screen/calendar-screen.stories.tsx` | Fixed incorrect assertion (`>= 1` → `toBe(0)`) in `Empty` play() fn |
