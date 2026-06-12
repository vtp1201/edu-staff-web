---
name: storybook-runner-env-issue
description: Local Storybook browser runner (vitest.storybook.mts) fails with ESM/CJS incompatibility
metadata:
  type: project
---

Running `bun vitest run --config vitest.storybook.mts` fails locally with:
`ERR_REQUIRE_ESM: require() of ES Module vite-tsconfig-paths/dist/index.js from vite-plugin-storybook-nextjs/dist/index.cjs not supported`

**Why:** `vite-plugin-storybook-nextjs` uses CJS require() but vite-tsconfig-paths is ESM-only. This is a pre-existing env issue, not introduced by story/test changes.

**How to apply:** When reporting Storybook interaction test results locally, note that the browser runner cannot execute; confirm tests pass in CI/CD pipeline instead. Unit tests (`vitest run`) still work fine.
