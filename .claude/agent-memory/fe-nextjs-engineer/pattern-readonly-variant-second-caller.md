---
name: pattern-readonly-variant-second-caller
description: US-E13.10 — adding a read-only second caller to an existing mutation screen (readOnly prop on the shared table + thin new screen, not a boolean on the mutation screen)
metadata:
  type: project
---

Read-only second caller for an existing admin screen (US-E13.10 principal roster).

**Why:** the packet's "reuse the screen with a `readOnly` prop" instinct breaks
down when the screen's prop contract *requires* N Server Actions and owns a
confirm-dialog state machine — a boolean would force dead branches into the
admin contract.

**How to apply:**
- Split the mechanism in two: (a) `readOnly?: boolean` **in place** on the leaf
  composed component that bakes in affordances (`RosterTable`) — omit checkbox
  column, bulk bar, per-row destructive button, dead disabled placeholders; make
  the mutation callbacks optional (`onX?.()`). (b) a NEW thin screen in the SAME
  feature's `presentation/` that composes the already-mutation-free siblings
  (breadcrumb, info card) + the leaf in readOnly. Zero duplicated logic, no new
  feature module — same domain entities, second caller.
- Omission proof is cheap in node env: `renderToStaticMarkup` + a
  `NextIntlClientProvider` wrapper, assert `not.toContain('role="checkbox"')`
  / the i18n label strings. **React renders the attribute as `colSpan="8"`, not
  lowercase `colspan`** — assert the camelCase form.
- Don't nest a second `<main>`: `AppShell` already renders
  `<main id="app-shell-main" className="… p-4 sm:p-6">`. Older screens
  (admin roster) nest one with its own `px-8 py-6` — do not copy that.
- Verify BE role gating in the Go use case, not the openapi prose. For
  `GET /api/v1/classes`, `list_classes.go` has an explicit
  `roleManager = "MANAGER"` admin-tier read branch (US-164) → web's `principal`
  (which collapses ADMIN+MANAGER) gets a real 200, no hybrid needed.
- An RSC page with branching (default class / query param / two failure paths)
  IS unit-testable in node: `vi.mock` the DI module, `await Page({searchParams})`,
  then `await element.props.children.type(props)` through the Suspense wrapper
  and assert the client screen's `vm` props.

**Review-fix pass (same story):**
- `readOnly?: boolean` + optional `onX?.()` handlers is a *reviewable defect*: a
  future non-readOnly caller that forgets a handler compiles and ships a dead
  button. Tighten to a union discriminated on the flag
  (`{readOnly:true} | {readOnly?:false; onX:…; onY:…}`). Then you must read
  `props.readOnly` **at each guard** — destructuring it into a local (esp. with
  a `= false` default) severs the narrowing link and `props.onX` goes optional
  again. Prove both polarities with a throwaway probe file under `src/` +
  `bunx tsc --noEmit` (missing handler AND handler-passed-with-readOnly both
  error), then delete it. Test helpers that pass every prop at one JSX site must
  split into two call sites.
- 44px hit area around a smaller visual pill (pagination): the `<button>` gets
  `group inline-flex min-h-11 min-w-11` + the focus ring, the inner `<span>`
  keeps the design-spec 30px pill; move `hover:` → `group-hover:` on the span or
  hover dies. Icon inside an already-`aria-hidden` span doesn't need its own.
- `text-edu-text-muted` is 2.95:1 — fails AA for any meaningful text
  (e.g. "showing X–Y of Z"). `text-muted-foreground` aliases the 5.48:1 token.

See [[pattern-shared-list-states]] (ListError `showRetry` omit-not-disable for
403) and [[pattern-rsc-routing-gate-e23-2]] (RSC-props testing technique).
