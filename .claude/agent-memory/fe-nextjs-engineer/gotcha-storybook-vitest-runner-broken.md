---
name: gotcha-storybook-vitest-runner-broken
description: The Storybook vitest runner (bun run vitest:storybook) is broken env-wide — fails to load before any story runs
metadata:
  type: project
---

`bun run vitest:storybook` (the `@storybook/addon-vitest` interaction-test runner)
fails to boot with `ERR_REQUIRE_ESM` in `vite-plugin-storybook-nextjs` requiring
`vite-tsconfig-paths` (ESM-only). It crashes during preset load, before any
`.stories.tsx` `play` function executes.

**Why:** package version clash in the Storybook/Vite toolchain — not specific to any
story. Reproduced on existing stories (e.g. `attendance-screen`) too, so it predates
US-E12.4.

**How to apply:** When asked for Storybook interaction-test proof, write the `play`
functions (they are correct and will run once the toolchain is fixed) but do NOT claim
green from the runner. Report stories as authored + the runner-blocked status honestly.
The plain `bun vitest run` (domain/integration `*.test.ts`) is unaffected and is the
reliable proof channel. Flag the toolchain fix to fe-lead as a follow-up.
