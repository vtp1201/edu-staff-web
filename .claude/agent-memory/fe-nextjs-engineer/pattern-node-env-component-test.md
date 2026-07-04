---
name: pattern-node-env-component-test
description: How to write a runnable Vitest DOM-structure test for a shared presentational component in this repo's node-env toolchain (no @testing-library/react)
metadata:
  type: feedback
---

Vitest here runs `environment: "node"` (vitest.config.mts) and `@testing-library/react` + jsdom are NOT installed (only `@testing-library/dom|jest-dom|user-event`). So you canNOT `render()` a React component in a `.test.tsx`.

Two established, honest options for a shared presentational component:
1. **Pure-helper node test** — extract branching logic to a pure fn (e.g. `statusToneClass`, `compactToneClass`) and unit-test that; render coverage lives in `.stories.tsx`. (status-badge, stat-card, child-switcher do this.)
2. **`renderToStaticMarkup` (react-dom/server) string assertions** — for a component with no extractable pure logic (conditional child rendering only), render to an HTML string in node and assert on it: `role="status"`, `aria-hidden="true"`, presence/absence of `<button>`/`<h2>`, conditional body/cta. This is real runnable RED→GREEN proof without jsdom. Used for `components/shared/empty-state`.

**Why:** keeps TDD honest and runnable under `bun vitest run`. onClick won't fire in static markup — that's fine, it's a structure test; interaction assertions go in Storybook `play()` (authored honestly but the `vitest:storybook` runner is broken env-wide — see [[gotcha-storybook-vitest-runner-broken]]).

**How to apply:** when a plan says "Vitest + Testing Library" but you hit the node-env/no-RTL wall, use `renderToStaticMarkup` for structure + `play()` for interaction, and note the deviation in your report.

Canonical shared empty-state: `src/components/shared/empty-state/` — `EmptyState({icon,title,body?,cta?,className})`, presentation-only (callers pass already-translated strings), matches design-spec `emptyStatePattern`.
