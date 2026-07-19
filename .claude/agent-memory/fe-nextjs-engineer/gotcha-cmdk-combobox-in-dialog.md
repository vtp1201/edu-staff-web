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

- **Dialog focus-trap steals focus from a nested portalled cmdk input** → the
  search input is UNTYPEABLE (verified: input value stays "" even with explicit
  `.focus()` + `userEvent.keyboard`; `modal` on the Popover does NOT fix it). The
  standalone combobox types fine — only fails nested in a Dialog. Fix chosen:
  fetch candidates on OPEN (`enabled: !selected`, not `debouncedQ.length>0`) so a
  selection needs NO typing — also better UX (initial list on open). Story then
  opens the combobox and clicks a pre-loaded option. Full arrow+Enter keyboard
  SELECT is proven in the STANDALONE combobox story (works outside a dialog); the
  in-dialog keyboard story asserts keyboard-open + `role="option"` listbox only.

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
