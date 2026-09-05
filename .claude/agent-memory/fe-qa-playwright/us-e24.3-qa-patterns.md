---
name: us-e24.3-qa-patterns
description: QA patterns from US-E24.3 student course-timeline gate — mislabeled Storybook viewport preset, real keyboard-tab-order + locked-row-activation-attempt recipes
metadata:
  type: project
---

US-E24.3 (student `/courses/[courseId]` weekly timeline) had an unusually strong
self-built baseline (fe-nextjs-engineer wrote 11 interaction stories + full
unit/page/action test coverage across 2 fix rounds already). Findings:

- **Storybook `globals: { viewport: { value: "mobile1" } }` resizes to 320px, NOT
  375px** — confirmed with a throw-and-read-`clientWidth` probe. `mobile1`/`mobile2`
  are addon-viewport's built-in presets (320/414), not literal pixel names. A story
  named/commented "Mobile375" using this preset is silently testing 320px instead —
  not vacuous (320 is a strict subset of 375, so the AC still holds), but mislabeled.
  When an AC needs an EXACT breakpoint (375, 768, 320…), use the project's real
  pattern instead: `const { page } = await import("vitest/browser"); await page.viewport(375, 800);`
  (precedent: `principal-classes-screen.stories.tsx` `Viewport320_CardList`/`Viewport375_CardList`).
  Don't trust a viewport-preset-named story's number without checking the preset table.
- **Real keyboard-tab-order proof recipe** for a mixed openable/locked row list: get
  all `button`s via `canvas.getAllByRole("button", {expanded: false})`, `body.focus()`,
  then loop `await userEvent.tab()` + `expect(row).toHaveFocus()` per row IN DOM ORDER;
  one more `Tab` past the last button must NOT land inside the locked row's
  `[aria-disabled]` ancestor (`lockedRow.contains(document.activeElement)` false). This
  actually proves un-reachability, not just "no `tabIndex` in the JSX".
- **Real locked-row-activation-attempt recipe**: `userEvent.click(lockedRow)` then
  force-`.focus()` it and send `{Enter}`/`" "` via `userEvent.keyboard` — assert
  `aria-expanded` never appears and no expand panel renders. Confirms a genuinely
  inert element, not just "looks disabled".
- Both probes PASSED on first write here — no real defect found, just closed a
  static-only AC-4/AC-7 gap with actual interaction proof (added 3 stories:
  `Viewport375Real`, `KeyboardOperability`, `LockedRowRejectsActivation` in
  `course-timeline.stories.tsx`).
- Full suite: `bun vitest run` 529 files/4245 tests green; storybook browser suite
  `vitest.storybook.mts` 161 files/1280 tests green (one run took ~8.5min — run it
  with `run_in_background` + Monitor/poll rather than a blocking foreground call).
  No flaky tests observed this round (console noise from unrelated `audit-log`
  timeZone warnings + shadcn `Table` hydration warnings in OTHER stories, harmless).
