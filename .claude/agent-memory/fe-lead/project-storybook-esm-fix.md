---
name: storybook-esm-fix
description: Storybook interaction runner was broken (ERR_REQUIRE_ESM) — fixed via bun patch + postcss CJS + story decorators; ADR 0032
metadata:
  type: project
---

The Storybook interaction-test runner (`bun run vitest:storybook`) was broken env-wide with
`ERR_REQUIRE_ESM` due to Node 20 + vite@8 + @storybook/nextjs-vite@10.4.2.

**Why:** `@storybook/nextjs-vite/dist/preset.js` used `createRequire()` to synchronously load
`vite-plugin-storybook-nextjs` at module-init time, forcing its CJS build which then
`require()`d `vite-tsconfig-paths@5.x` and `vite@8.x` — both ESM-only. Also
`postcss.config.mjs` (ESM) was `require()`d by bundled postcss-load-config.

**Fix applied (2026-06-13, INFRA-storybook-test-runner, ADR 0032):**
1. `bun patch @storybook/nextjs-vite@10.4.2` — patches `dist/preset.js` to move
   `require3("vite-plugin-storybook-nextjs")` from module-init into `async viteFinal()` as
   `await import()`. Patch stored at `patches/@storybook%2Fnextjs-vite@10.4.2.patch`,
   re-applied on every `bun install`.
2. `postcss.config.mjs` → `postcss.config.js` with `module.exports = { ... }` (CJS).
3. Story fixes: add `parameters: { nextjs: { appDirectory: true } }` to any story whose
   component uses `useRouter()` from `next/navigation`; add `NextIntlClientProvider` decorator
   to stories missing i18n context.

**Result:** 110/110 Storybook tests, 194/194 unit tests, all green.

**How to apply:** When upgrading `@storybook/nextjs-vite`, the patch file will fail to apply
if the upstream has changed `dist/preset.js`. In that case: (a) check if upstream fixed the
`createRequire` bug themselves, (b) if not, re-apply the patch manually by finding the new
location of the synchronous require call and replacing with dynamic import.

[[parallel-branch-workflow]]
