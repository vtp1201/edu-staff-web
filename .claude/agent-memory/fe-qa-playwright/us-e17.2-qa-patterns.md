---
name: us-e17.2-qa-patterns
description: grade-book-table mobile scroll QA — Chromium drops -webkit-overflow-scrolling from CSSOM; real-browser storybook runner now works
metadata:
  type: project
---

US-E17.2 (grade-table mobile scroll + sticky column, DR-010/UX-03).

**Storybook browser runner (`vitest.storybook.mts`) now WORKS locally** — the
ESM/CJS `vite-tsconfig-paths` issue in [[storybook-runner-env-issue]] did not
reproduce this session (2026-07-04). Always try
`bun vitest run --config vitest.storybook.mts <path>` before assuming it's
broken; it gives real Chromium DOM/CSSOM proof, not just jsdom-less string
matching.

**Real-browser finding (test bug, not component bug):** a `play()` asserting
`region.style.getPropertyValue("-webkit-overflow-scrolling")` fails in real
Chromium — the browser doesn't recognize this non-standard (Safari-only)
property and drops it entirely from the CSSOM (`style.cssText`,
`getPropertyValue`, and even `getAttribute("style")` all come back empty once
React sets it via the JS style API — confirmed via a standalone Playwright
probe). This is expected graceful degradation on non-Safari engines, not a
regression. Correct fix: assert the CSS declaration's presence via
`renderToStaticMarkup` (server HTML string, unit test) — real Chromium DOM
cannot observe it. Any `-webkit-*` prefixed inline style needs the same
treatment: prove intent in a node/SSR string test, don't assert via
`getComputedStyle`/CSSOM in a Chromium-driven interaction test.

**Reusable computed-layout assertion set for sticky-column + scroll-wrapper
components:** `getComputedStyle(el).overflowX === "auto"`,
`paddingLeft/paddingRight === "0px"`, `getBoundingClientRect().width` for
min-width proof, `position/left/zIndex` on sticky cells, and pinned-header via
`getBoundingClientRect().left` unchanged before/after `region.scrollLeft = 100`.
These all work reliably in the real browser runner and are stronger proof than
className string matching alone.

**AC coverage pattern:** role-agnostic layout components (same wrapper
structure across teacher/principal/student/parent) don't need per-role
scroll-behavior duplication — one canonical viewport story (e.g. `role:
"student"`) satisfies the shared mechanism; only add a second per-role story
when the AC explicitly names a different role at a different viewport (here:
AC-16 parent @375, AC-17 teacher @768).
