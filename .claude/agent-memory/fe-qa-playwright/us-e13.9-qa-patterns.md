---
name: us-e13.9-qa-patterns
description: QA patterns for US-E13.9 teacher students roster (cross-class aggregation, list-pagination promotion) — rare clean-self-report story
metadata:
  type: project
---

US-E13.9 (teacher students roster, closes dead `/teacher/students` sidebar link):
self-reported proof (6 unit cases, 9 stories, list-pagination promotion) was
verified GENUINELY accurate on re-derivation — rare, most stories have at least
one overstated/vacuous claim. All 6 use-case unit tests actually assert what
they claim (zero-call guard on empty classes, verbatim class-list-failure
propagation, flatten order, de-dupe-keeps-first, per-class degrade with
`failedClassCount`, all-failed-is-ready-not-error). The MUST-FIX "all rosters
failed ≠ no classes assigned" copy fix is real and story-proven
(`AllClassRostersFailed` asserts the `emptyAllFailed` title appears AND the
`empty` copy does NOT appear). The two SHOULD-FIXes (filtered header count,
decision-0026 pager promotion) are both genuinely fixed and tested.

**One real gap found and closed**: AC "keyboard/focus basics on search input,
class select, pagination, and row links" only had proof for the row link
(`.focus()`/`toHaveFocus()`) and the search input indirectly via
`userEvent.type`. The class-filter `<Select>` trigger and the pager's
next/prev buttons had ZERO keyboard-specific test (only mouse `userEvent.click`
paths existed for both, e.g. `ClassFilter` story). Added a `KeyboardOperability`
story exercising: Select trigger focus + `{Enter}` opens listbox + `{Escape}`
closes it; search input direct focus; pager next-button focus + `{Enter}`
(not click) advances the page. Real browsers respond to Enter/Space on native
`<button>` elements by default — this works in the Playwright-backed Storybook
browser runner without extra plumbing.

`list-pagination.test.tsx` node-env recipe (no @testing-library/react in this
repo's plain Vitest — uses `renderToStaticMarkup` + regex/string-contains on
the HTML string) is a solid template for proving CSS-class-level AC claims
(44px touch target via `size-11` string presence + absence of `size-9`; AA
contrast via `text-edu-text-secondary` presence + absence of
`text-edu-text-muted`) without a browser.

Full-suite counts at close: `bun vitest run` → 445 files / 3204 tests.
`vitest --config vitest.storybook.mts` (full, no filter) → 153 files / 1145
tests (was 1144 before QA's added keyboard story). `bunx tsc --noEmit` clean.
`bun build` (NEXT_PUBLIC_USE_MOCK unset) succeeds, route
`/[locale]/t/[tenant]/teacher/students` present. One pre-existing unrelated
lint warning + one unrelated `<tfoot><p>` console.error from
`components/ui/table/table.stories.tsx` (nesting block content in `<tfoot>`)
surfaced during the full storybook run — confirmed via `grep -rl TableFooter`
that it's NOT part of this US's changed files, don't let it block the gate.
