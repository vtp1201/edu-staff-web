---
name: us-e24.2-qa-patterns
description: QA patterns for US-E24.2 student-courses card summary (openCount/nextDue, per-card degrade) — real focus/touch-target/viewport gap-fill technique
metadata:
  type: project
---

US-E24.2 (`/student/courses` card "sắp đến hạn" + "N mục đang mở") — another rare fully-accurate
self-report: domain (`summarizeCourse`, `ListCoursesWithSummaryUseCase`), derive-VM layer, and
`page.test.ts` RSC wiring were all genuinely proven (real `Promise.allSettled` per-course degrade
test, real 48h boundary test at exactly 48h vs 48h+1min, real RSC integration test calling
`StudentCoursesPage()` directly since the route is `next/headers`-gated hence force-dynamic and
never executes during `bun build`).

Gaps found (all closed with new Storybook browser-mode stories, not production code):
- AC "44px+ touch target" had zero proof beyond Tailwind class inspection — closed with a real
  `getBoundingClientRect()` check on the focused card link (`TouchTarget_CardMeetsMinimum`).
- AC "focus ring visible / not clipped by Card's overflow-hidden" was only a static
  `toHaveClass("focus-visible:ring-inset")` assertion — that proves the class STRING exists, not
  that Chromium paints it. Closed with a real `.focus()` + `getComputedStyle(el).boxShadow`
  before/after comparison (`FocusRing_VisibleWhenFocused`). Reasoning worth keeping: `ring-inset`
  renders as an INSET `box-shadow`, which by construction is never clipped by an ancestor's
  `overflow: hidden` (unlike an outward ring) — so the static class check was actually adequate
  design-wise, but adding the real-focus computed-style check is strictly stronger QA evidence and
  cheap to add.
- AC "tab qua grid, Enter mở link" had zero interaction test — closed with
  `userEvent.tab()` × 3 walking the whole grid in document order, asserting `toHaveFocus()` +
  correct `href` per card (no Enter-keydown spy needed/possible: it's a bare `<a>`, native browser
  navigation, nothing to intercept — the useful assertion is "focus reaches the right link with
  the right destination in tab order").
- AC "320px không vỡ" was only a **code comment** citing `minmax(min(300px,100%),1fr)` — never
  actually rendered at 320px. Closed with the established `page.viewport(320, h)` +
  `document.documentElement.scrollWidth <= 321` pattern (same recipe as
  [[us-e17.1-qa-patterns]]/principal-classes 320px stories).

Reusable recipe: `const { page } = await import("vitest/browser"); await page.viewport(w, h);`
inside a story's `play()` — real Chromium resize, not a media-query mock. Grep
`principal-classes-screen.stories.tsx` for the canonical `Viewport320_CardList` shape before
reinventing.

No production bug found this round — clean PASS after gap-fill (4 new stories, 0 modified
assertions in existing stories).
