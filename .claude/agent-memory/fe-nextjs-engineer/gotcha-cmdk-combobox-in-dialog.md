---
name: gotcha-cmdk-combobox-in-dialog
description: Adding cmdk/Command + building a searchable combobox that lives inside a modal Dialog (US-E20.1 SearchCombobox) — install + 4 nested-Radix gotchas
metadata:
  type: feedback
---

Building a searchable combobox (Popover + cmdk `Command`) used INSIDE a modal
shadcn `Dialog` (US-E20.1 `components/shared/search-combobox` in the create-link
dialog). Cluster of install + nested-Radix issues.

**Why:** these cost a full debug loop each; all are reproducible for any future
"combobox in a dialog" or "cmdk" work.

**How to apply:**

- **`bun ui:add command` / `bun add` HANG in this environment** — the shadcn CLI
  waits on an interactive TTY (no output, never completes) and plain `bun add`
  also hangs even with sandbox off (registry IS reachable — `curl` 200). Fix:
  `npm install <pkg> --no-save` (works), then declare it in `package.json` and
  run `bun install` (also slow/hangs foreground but eventually reconciles
  `bun.lock` in the background — verify `grep -c <pkg> bun.lock`). Hand-write the
  shadcn primitive (`components/ui/command/`) matching new-york + the repo's
  `cmdk` import + `data-slot` conventions; flag to fe-lead that `ui:add` was
  bypassed so a later re-sync is a no-op.

- **PopoverContent needs `pointer-events-auto`** when the popover can open from
  inside a modal Dialog: Radix Dialog locks `document.body { pointer-events:none }`;
  the portalled popover inherits it and every control inside becomes un-clickable
  (userEvent: "element has pointer-events: none"). Real bug for users, not just tests.

- **Dialog focus-trap steals focus from a nested PORTALLED cmdk input → RENDER
  THE PANEL INLINE (no Popover/Portal). This is the real DEF-2 fix.** Root cause
  (diagnosed via `document.activeElement` after open = the popover-TRIGGER, not
  the input): Radix Dialog's `FocusScope` is trapped; a Popover portals the cmdk
  input OUTSIDE the dialog's DOM subtree, so the FocusScope yanks focus back to
  the trigger. Arrow/Enter then hit the TRIGGER — Enter toggles the popover shut,
  selecting nothing (exactly the "popover closes, placeholder returns" bug).
  **`modal` on the Popover does NOT pause the Dialog's FocusScope** (verified in
  radix-ui 1.6.0 — focus still landed on the trigger). Fix that WORKS: drop the
  Popover entirely and render the `Command` panel as an inline
  `absolute top-full` sibling of the trigger inside the same `relative` container
  — now the cmdk input is a descendant of the dialog's own focus scope, keeps
  focus, and Arrow+Enter selects for real. Re-implement the popover niceties
  yourself: `useEffect` focus the input on open, capture-phase `pointerdown`
  outside-close, `onKeyDown` Escape→close+refocus trigger. A REAL in-dialog
  arrow+Enter story then asserts the selected chip renders (don't punt to the
  standalone story). (Earlier fetch-on-open `enabled:!selected` mock stays — good
  UX + lets keyboard select with no typing.)

- **Radix `Select` inside a Dialog leaves `aria-hidden="true"` on the dialog**
  during its close exit-animation (`hideOthers`), so `getByRole` finds "no
  accessible roles" for a beat. After selecting a Select option, before querying
  the dialog's submit button:
  `await waitFor(() => expect(document.querySelector('[data-slot="dialog-content"]')?.getAttribute("aria-hidden")).not.toBe("true"))`
  then re-scope `within(that element)`.

- **A trigger `<button>` with an associated `<label htmlFor>` takes the LABEL as
  its accessible name** (button is a labelable element), NOT its placeholder/
  content. Query combobox triggers by the field label ("Học sinh"), not the
  placeholder.

Related: [[gotcha-storybook-baseline-failures-and-dual-dialog]],
[[pattern-portal-dialog-testing]], [[pattern-destructive-confirm-and-moderation]].
