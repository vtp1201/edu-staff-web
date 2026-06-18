---
name: gotcha-storybook-vitest-runner-broken
description: Storybook vitest interaction runner — was broken env-wide (ERR_REQUIRE_ESM); confirmed WORKING again as of 2026-06-18 via `bun vitest run --config vitest.storybook.mts <path>`
metadata:
  type: project
---

**Status 2026-06-18 (US-E10.1 messaging):** the Storybook interaction-test runner
WORKS. Ran `bun vitest run --config vitest.storybook.mts src/features/messaging`
→ all 7 `.stories.tsx` `play` functions executed and passed. The earlier
`ERR_REQUIRE_ESM` boot failure (`vite-plugin-storybook-nextjs` requiring ESM-only
`vite-tsconfig-paths`) is no longer reproducing — toolchain appears fixed.

**How to apply:** Storybook interaction proof is now a real channel again —
run `bun vitest run --config vitest.storybook.mts <feature-path>` and report the
true result. Note the package.json script alias is `vitest:storybook` but it
invokes the same `--config vitest.storybook.mts`. If it regresses to
`ERR_REQUIRE_ESM`, fall back to authoring honest `play` fns + plain `bun vitest run`
for domain/integration proof, and flag to fe-lead.

**Gotcha for screens using `useSearchParams()`:** in the storybook test env the
Next router context may be absent → `useSearchParams()` returns null. Guard with
`searchParams?.get(...) ?? null` so the component renders under both Next runtime
and the storybook runner.
