---
name: pattern-portal-dialog-testing
description: How to TDD-test a Radix-portal dialog in this node-env repo, and the DestructiveConfirmDialog shared component
metadata:
  type: project
---

Radix portals do NOT render under `renderToStaticMarkup` (node env): `Portal`
gates on a `mounted` state set in `useLayoutEffect`, which never runs server-side
→ empty string. Also `AlertDialogTitle`/`Description` throw `"DialogTitle must be
used within Dialog"` if rendered outside the Root. So you cannot assert an OPEN
dialog's content via Vitest static markup here.

**Pattern (proven US-E17.8):** split the proof across two layers —
- Extract a **pure, portal-free sub-component** (e.g. `DestructiveDialogActions` =
  the two footer `<Button>`s) and unit-test THAT via `renderToStaticMarkup`:
  `aria-busy="true"`, `disabled=""` (attr form — the `disabled:` utility classes
  are always in className, so match `disabled=""` not the substring `disabled`),
  `data-variant="destructive"`/`"outline"`, DOM order (cancel before confirm).
  Also assert `open=false` → `renderToStaticMarkup(...) === ""`.
- **Storybook play fns** (browser) cover role="alertdialog", onConfirm/onCancel
  call-counts, Escape, loading — query portal content with `within(document.body)`
  and use a `NextIntlClientProvider` decorator (`.storybook/preview.ts` has none).

**DestructiveConfirmDialog** lives at `components/shared/destructive-confirm-dialog/`.
Canonical for all destructive/high-stakes confirms (design-spec.jsonc
#interactionPatterns.destructiveConfirmDialog). Props: open/title/body/confirmLabel/
isLoading?/onConfirm/onCancel. Cancel label resolved internally from
`Common.confirmDialog.cancel` (7-prop contract has no cancelLabel; NFR bans
hardcoded strings). Uses plain `<Button>`s NOT `AlertDialogAction`/`Cancel` —
Radix auto-close would fire `onOpenChange(false)`→onCancel in ADDITION to onConfirm,
breaking exactly-once. Escape/overlay still route via `onOpenChange`.

**Consumer wiring gotchas:** confirm button no longer auto-closes → the call site's
confirm handler must close the dialog itself (set open=false on success). Map old
`onOpenChange={setX}` dialogs to `onCancel={() => setX(false)}`. When migrating a
dialog that owned internal `submitting` state (e.g. archive-class), lift that state
to the call site and pass it as `isLoading`.

**Always-mounted parent + separate confirm-dialog state (DEF-001):** if a confirm
dialog lives inside an always-mounted drawer/Sheet and its `open` is driven by a
DIFFERENT state var than the drawer's, closing the drawer (`onOpenChange(false)`)
does NOT reset the dialog's var → the focus-trapped dialog lingers over the closed
drawer. Reset the dialog's open state in the SAME success branch, not only in a
reopen `useEffect` (which fires on open, not close).

**Radix exit-animation lingering node vs `.not.toBeInTheDocument()`:** a Radix
AlertDialog/Dialog does NOT unmount immediately on close — with `motion-safe`
`data-[state=closed]:animate-out` it stays mounted with `data-state="closed"`
(role intact) until the ~200ms animation ends. A SYNCHRONOUS Storybook
`expect(queryByRole("alertdialog")).not.toBeInTheDocument()` right after the close
click FAILS even when the close is functionally correct. To prove a close worked in
the storybook runner, assert `data-state="closed"` (or wait with
`waitForElementToBeRemoved`), not `.not.toBeInTheDocument()`. When triaging such a
red, stash your change and compare `data-state` open (bug) vs closed (fixed) in the
same runner. NOTE: `vitest.storybook.mts` DOES run here now (contra the older
"broken env-wide" note) but some stories still fail with "component failed to render
properly, likely due to a configuration issue" — verify baseline before blaming a fix.
