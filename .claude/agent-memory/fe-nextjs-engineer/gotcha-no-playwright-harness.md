---
name: gotcha-no-playwright-harness
description: Repo has NO standalone Playwright E2E harness — Playwright is only the Storybook vitest browser provider; interaction stories ARE the E2E layer
metadata:
  type: project
---

There is **no standalone Playwright E2E suite** in `edu-staff-web` (no
`playwright.config.*`, no `e2e/` dir, no `test:e2e` script). `playwright` +
`@vitest/browser-playwright` exist ONLY as the browser provider for the
Storybook interaction runner (`vitest.storybook.mts` → `provider: playwright({})`).

**Why:** the repo's "E2E / Story" test tier (`.claude/rules/tdd.md`) is delivered
as **Storybook interaction stories** with `play()` functions, executed in a real
Playwright-driven browser via `bun vitest:storybook run`.

**How to apply:** when a story packet's plan says "Playwright E2E spec", do NOT
scaffold a standalone Playwright test (it would be unrunnable dead code needing a
config + auth/tenant fixtures + a running server — all out of implementer scope).
Deliver the flow coverage as `.stories.tsx` interaction stories instead (states:
loading/empty/error/success + feature-specific ones), and flag to `fe-lead` that
a true Playwright harness would be separate infra/QA work. `bun vitest:storybook
run <path>` scopes to one feature; ~66 pre-existing baseline failures exist
env-wide (timetable/subject-catalogue "app router not mounted") — filter to your
own files. Screens owning `useRouter`/portals need `parameters.nextjs.appDirectory:true`;
TanStack-Query screens need a per-story `QueryClientProvider` decorator
(`retry:false, retryDelay:0`).
