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

**Reconfirmed working 2026-07-16 (US-E18.7):** `bun vitest:storybook run <name>`
executed all 10 `play` fns in the chromium browser project. Default `bun vitest run`
is the **node** env (`vitest.config.mts`, `include: *.{test,spec}`) and does NOT run
`.stories.tsx` — stories only run via `vitest:storybook` (playwright browser). So the
node-env baseline count never changes when you add/edit stories.

**Driving a shadcn/Radix `Select` in a `play` fn (US-E18.7 idiom):**
- Trigger has `role="combobox"`; its accessible name = the `<Label htmlFor>` text
  (associate every Select via `useId`/id). Query `canvas.findByRole("combobox",
  { name: <labelText> })` — use `findBy` (async retry), NOT `getBy`: after one Select
  closes it leaves a **transient `aria-hidden` on the background** that makes the next
  combobox briefly unqueryable (Radix bleed). `findBy` waits it out.
- Options render in a portal on `document.body` with `role="option"`:
  `await within(document.body).findByRole("option", { name })`, then click.
- Don't reuse the Select's own `placeholder` string for a sibling prompt paragraph —
  the placeholder text lives in the trigger too, so `findByText` matches 2 nodes and
  fails. Give the prompt its own i18n key.
