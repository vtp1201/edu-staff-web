---
name: pattern-forced-mock-di-and-responsive-table-card
description: US-E13.8 principal classes — RBAC-forced-mock DI facade (never USE_MOCK), CSS-breakpoint table↔card duplicate-query traps, resetModules breaks instanceof, one-accessible-name rule
metadata:
  type: project
---

**Forced-mock DI facade (BE RBAC gap ≠ dev convenience).** When the BE role check
excludes the role a screen ships for (`core`'s `ListClassesUseCase.Execute` grants
only `isAdmin`/`isTeacher`; `MANAGER` falls through to `ErrClassForbidden`), the
per-screen DI factory returns the mock **unconditionally** — no `USE_MOCK` branch —
and the doc comment must say "do NOT fix this to be conditional" plus the Go file +
cross-repo ask number. Prove it with a test that imports the factory under
`NEXT_PUBLIC_USE_MOCK` unset/`"false"`/`"true"` AND one asserting
`createServerHttpClient` is never called. Admin's own factory stays real-capable —
one screen's gap must not degrade a sibling's real path.

**Why:** `USE_MOCK`-gating it would mean every principal sees access-denied in any
non-mock env; a reviewer seeing an unconditional `new MockX()` will otherwise "fix" it.

**`vi.resetModules()` kills `instanceof`.** Env-matrix DI tests must re-`import()`
the factory per case, so the returned class identity differs from a statically
imported one. Assert `repo.constructor.name === "MockXRepository"` instead.

**CSS-breakpoint table↔card (`hidden md:block` / `md:hidden`) — both branches are in
the DOM.** Consequences learned the hard way in Storybook (real Chromium, real CSS):
- `findByText("Chưa phân công")` finds BOTH copies → "multiple elements". Scope every
  assertion: `within(await canvas.findByRole("table"))` for the desktop branch,
  `canvas.findByRole("listitem", { name: … })` for the card branch. Role queries skip
  the `display:none` branch, so `queryByRole("table")` is the clean "am I on mobile"
  probe.
- Duplicate sr-only `role="status"` in both skeleton variants is fine — the hidden one
  is out of the a11y tree.
- Always `await page.viewport(1280, 900)` (from `vitest/browser`) at the top of any
  desktop-branch play fn; viewport leaks between stories in the shared page.

**One accessible name, one control.** Rendering "Xóa bộ lọc" in both the filter bar
and the filtered-empty state broke `getByRole("button", { name })` with "multiple
elements" — that test failure was a real UX smell. Suppress the filter-bar copy while
the empty state owns it (`hasActiveFilter && !(isEmpty && variant === "zero-filtered")`).

**403 is not retryable — at EVERY control, not just the full-page one.** The shared
`LoadMoreButton`'s `hasError` only swaps the label and keeps the button enabled, which
is right for network failures and wrong for `forbidden` (QA DEF-E13.8-01). Branch at
the SCREEN (`loadMoreError === "forbidden" ? <ErrorState variant="forbidden"/> :
<LoadMoreButton/>`) — never patch the shared component, whose other consumers depend on
the generic behaviour. Whatever "absent, not disabled" rule the full-page error state
follows must be applied to every secondary retry affordance on the same screen.

**Empty-variant discriminator:** `classes.length === 0` → "no rows at all" (no
clear-filters); otherwise rows loaded but none visible → "filtered" (clear-filters).
Do NOT key it off `hasActiveFilter`, or an all-archived school under the default
ACTIVE filter renders the wrong (dead-end) message.

**Biome rejects `role="group"` on a div** (wants `<fieldset>`, see
[[gotcha-filter-pills-a11y]]). For record cards, put the composed `aria-label` on the
`<li>` itself (`listitem` role) instead — stronger semantics, no suppression.

Also: an exact-params assertion (`expect(get).toHaveBeenCalledWith(EP, { params: {...},
raw: true })`) is the test that *should* break when you add an optional query param —
update it in the same red step rather than loosening it.
