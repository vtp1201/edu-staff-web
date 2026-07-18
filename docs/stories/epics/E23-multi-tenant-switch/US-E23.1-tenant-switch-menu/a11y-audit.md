# US-E23.1 — Accessibility Audit (WCAG 2.1 AA)

Auditor: `fe-accessibility-auditor` · Branch: `feat/us-e23.1-tenant-switch-menu`
(audit-only, read-only — no implementation files were left modified; a
verification step temporarily patched `header.tsx` and added two throwaway
Storybook stories to reproduce a live-focus bug in a real Playwright browser
via `bunx vitest run --config vitest.storybook.mts`, then fully reverted
before this report was written — confirmed via `git status --porcelain`
returning clean).

## 1. Audit Summary

Scope: `src/components/shared/tenant-card/{tenant-card.i-vm.ts, tenant-logo.tsx,
tenant-card.tsx, tenant-switch-dialog.tsx, switch-activation.ts}` +
`.stories.tsx`, `src/components/layout/app-shell/header/header.tsx`,
`src/components/layout/app-shell/app-shell.tsx`, against `architecture.md §7`
(Accessibility Contract) and `spec.md` NFR-001–003.

Most of the static contract is correctly implemented: `TenantCard` is a real
`<button>` with a single composed `aria-label`, visible-text "Hiện tại"/role
badges (never color-only), a real `role=status`/`aria-live=polite`/`sr-only`
loading region, a card-scoped `role=alert` 403 error, AA-safe address-line
contrast, and the true DOM-absence zero-noise gate for the menu item.

**However, the single most important thing this audit was asked to verify —
focus-restore-on-close / Risk B — FAILS, and it fails in a way that is worse
than "focus lands on `<body>`": when the dialog is opened via the real header
flow (DropdownMenuItem inside an open DropdownMenu), the dialog becomes
undismissable by keyboard.** This was verified empirically against the
unmodified committed code in a real headless Chromium instance (not
speculation) — see §3, A11Y-001. **Overall verdict: FAIL — blocking issue,
must be fixed before the design-review gate.**

Findings: 1 Blocking, 1 Major, 1 Minor.

## 2. WCAG 2.1 AA Coverage

| Criterion | Description | PASS/FAIL | Finding ID |
| --- | --- | --- | --- |
| 2.1.2 No Keyboard Trap | Escape must dismiss the dialog when idle | **FAIL** | A11Y-001 |
| 2.4.3 Focus Order | Focus moves into the dialog on open, and back to the invoking control on close | **FAIL** | A11Y-001 |
| 2.4.7 Focus Visible | `focus-visible:ring-2 ring-ring` present on `TenantCard` | PASS | — |
| 4.1.2 Name, Role, Value | `TenantCard` button semantics, `aria-current`/`aria-busy`, composed `aria-label` | PASS | — |
| 1.1.1 Non-text Content | Decorative icons need `aria-hidden`; `ArrowLeftRight` in the "Đổi trường" item is missing it | **FAIL** | A11Y-002 |
| 1.4.1 Use of Color | "Hiện tại"/role badges are visible text, not color-only | PASS | — |
| 1.4.3 Contrast (Minimum) | Address line `text-muted-foreground` → `--edu-text-secondary` (5.48:1) on `bg-card` (#fff) | PASS | — |
| 4.1.3 Status Messages | Per-card loading `role=status`/`aria-live=polite`; 403 `role=alert` scoped to the card | PASS | — |
| 2.5.5 Target Size (AAA, tracked as good practice here) | `TenantCard` `min-h-20` (80px) ≥ 44×44 | PASS | — |
| Reduced Motion | Card hover-lift and spinner both gated `motion-safe:` | PASS | — |
| 3.3.1/3.3.2 Error ID/Labels | 403 error is visible text (`error403`), i18n | PASS | — |
| Test coverage of the above | No Storybook story exercises the actual DropdownMenu→Dialog composed flow through *close* | **FAIL** (gap) | A11Y-003 |

## 3. Findings Catalogue

### A11Y-001 — Dialog opened from the header menu cannot be dismissed by keyboard; initial focus does not land inside it

**Severity: Blocking** (WCAG 2.1.2 No Keyboard Trap, 2.4.3 Focus Order — also
violates this story's own `architecture.md §7` row "Escape closes (guarded)"
and NFR-002/AC-10)

**Component:**
`src/components/layout/app-shell/header/header.tsx:186-213` (the
`DropdownMenuItem`/`TenantSwitchDialog` composition) +
`src/components/shared/tenant-card/tenant-switch-dialog.tsx:56-61`
(`handleOpenChange`) + `src/shared/use-dialog-return-focus.ts` (the shared
focus-restore hook `DialogContent` relies on).

**Issue:** For a keyboard/screen-reader user who opens "Chọn trường" via the
real path (Tab to the avatar trigger → Enter → Tab/Arrow to "Đổi trường" →
Enter), the dialog opens visually, but:
1. Focus does **not** move into the dialog's first focusable element (Radix
   default, and what NFR-002/architecture.md §7 promises). It stays on — or
   snaps back to — the header's avatar trigger button, which is now *behind*
   the modal dialog.
2. **Escape does not close the dialog at all** — not via `userEvent.keyboard`,
   not via a raw `document.dispatchEvent(new KeyboardEvent("keydown", {key:
   "Escape", bubbles:true}))`. The user is stuck: the only way out is a mouse
   click on the visible "×" close button or a card. This is a **keyboard
   trap** for a user who cannot click.

**Evidence (empirical, reproduced against the exact committed code, unmodified,
in a real headless Chromium browser via
`bunx vitest run --config vitest.storybook.mts`):**

Reproduction steps used (temporary story, reverted after — not left in the
repo): render `<Header memberships={twoTenants} currentTenantId="tenant-acme"
onSwitchTenant={noopSwitch} />`, click the "Menu người dùng" trigger, click the
real `menuitem` "Đổi trường" (mirrors the shipped `MultiTenant` Storybook
story in `header.stories.tsx:62-80`, which stops right after asserting the
dialog opens — it never asserts close/focus-restore). Then:

```
ACTIVE ELEMENT AFTER OPEN: BUTTON "Menu người dùng"   // NOT inside the dialog
MENU REMNANTS ([role="menu"] count): 0                 // dropdown did unmount
DIALOG DATA-STATE: "open"
→ document.dispatchEvent(new KeyboardEvent("keydown", {key:"Escape", bubbles:true}))
AFTER MANUAL DISPATCH: dialog still present === true
→ userEvent.keyboard("{Escape}")
AFTER USEREVENT ESC: dialog still present === true
```

For comparison, the SAME `TenantSwitchDialog`, opened via a **plain**
`<button onClick={() => setOpen(true)}>` (i.e. bypassing the DropdownMenu
entirely — this is how every existing `tenant-switch-dialog.stories.tsx`
story opens it, including `DismissBlockedWhileBusy`), closes correctly on
Escape when idle. **The bug is specific to the composed
DropdownMenu→(state)→Dialog path used by the real header, and none of the
existing stories exercise that composed path through to close.**

I also tried the documented Radix workaround for exactly this "open a Dialog
from a DropdownMenuItem" composition — adding `event.preventDefault()` in
`onSelect` before `setDialogOpen(true)` — as a hypothesis check (reverted
immediately after, not committed):

```
ACTIVE ELEMENT AFTER OPEN: DIV (the dialog content root) — better, but…
MENU REMNANTS ([role="menu"] count): 1   // DropdownMenuContent never unmounts
Escape: still does not close the dialog
```

`preventDefault()` alone made *focus* land inside the dialog, but because the
`<DropdownMenu>` in `header.tsx` is **uncontrolled** (no `open`/`onOpenChange`
prop), `preventDefault()`-ing the select also suppresses Radix's own
auto-close of the menu — so the (now invisible-behind-the-dialog but still
mounted) `DropdownMenuContent` remains a live dismissable layer that consumes
the Escape keypress meant for the `Dialog` on top of it. Neither the
"as-shipped" nor the naive `preventDefault()` fix is correct in isolation —
both leave Escape non-functional, just via different mechanisms.

**Fix:** Control the `DropdownMenu`'s own `open` state and close it
*explicitly* in the same handler that opens the dialog, deferring the dialog
open by one frame so Radix's dropdown-close focus/animation settles before
the dialog's own focus-trap grabs focus (this is Radix's own documented
"Dialog inside DropdownMenu" recipe):

```tsx
// header.tsx
const [menuOpen, setMenuOpen] = useState(false);
const [dialogOpen, setDialogOpen] = useState(false);

<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
  ...
  {canSwitch && (
    <DropdownMenuItem
      onSelect={(event) => {
        event.preventDefault();      // don't let Radix fight over focus mid-close
        setMenuOpen(false);          // close the dropdown ourselves...
        requestAnimationFrame(() => setDialogOpen(true)); // ...then open the dialog next frame
      }}
    >
      <ArrowLeftRight className="mr-2 size-4" aria-hidden="true" />
      {tSwitch("menuItem")}
    </DropdownMenuItem>
  )}
```

After this change, re-run the reproduction above (or better, promote it to a
permanent Storybook interaction test — see A11Y-003) and confirm:
`document.activeElement` lands inside the dialog on open, Escape closes it
when idle, and focus returns to the avatar trigger button
(`aria-label={t("userMenu")}`) on close (the existing
`useDialogReturnFocus`/`onCloseAutoFocus` wiring in
`src/components/ui/dialog/dialog.tsx:64-70` is correct in isolation and
should work once it isn't fighting the still-mounted `DropdownMenuContent`
for the focus event). If, after this fix, focus-restore to the exact trigger
button still doesn't land correctly, add an explicit `triggerRef` capture in
`header.tsx` (assign the avatar `<Button>` a `ref`, and pass
`onCloseAutoFocus={(e) => { e.preventDefault(); triggerRef.current?.focus(); }}`
on `<TenantSwitchDialog>`'s underlying `DialogContent` via a new prop) as the
engineer's own comment flagged as the fallback plan.

**Reference:** WCAG 2.1.2 (https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap.html),
2.4.3 (https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html), Radix UI
Dialog docs "Focus Management" + the well-known "Dialog trigger inside
DropdownMenu" composition caveat (Radix primitives FAQ /
github.com/radix-ui/primitives discussions on nested overlays).

---

### A11Y-002 — "Đổi trường" menu-item icon is not marked decorative

**Severity: Major** (WCAG 1.1.1 Non-text Content; also a direct contradiction
of this story's own finalized `architecture.md §7` contract, row 1: "icon
(decorative, `aria-hidden`)")

**Component:** `src/components/layout/app-shell/header/header.tsx:188`

**Issue:** `lucide-react`'s `createLucideIcon` does not set `aria-hidden` by
default (confirmed by reading
`node_modules/lucide-react/dist/cjs/lucide-react.js` — `defaultAttributes`
only sets `xmlns/width/height/viewBox/fill/stroke/strokeWidth/strokeLinecap/
strokeLinejoin`, no `aria-hidden`). Every OTHER icon this story adds is
explicitly marked (`TenantLogo`'s wrapping `<span aria-hidden="true">` in
`tenant-logo.tsx:55`; `Check` in `tenant-card.tsx:105`; `ChevronRight` in
`tenant-card.tsx:144`; the header block icon in
`tenant-switch-dialog.tsx:91`), but the `ArrowLeftRight` icon inside the
`DropdownMenuItem` is not:

```tsx
// header.tsx:187-190 (current)
<DropdownMenuItem onSelect={() => setDialogOpen(true)}>
  <ArrowLeftRight className="mr-2 size-4" />
  {tSwitch("menuItem")}
</DropdownMenuItem>
```

Some screen-reader/browser combinations expose untitled inline SVGs with an
implicit graphics role and announce something like "graphic" before the
"Đổi trường" text, adding noise around an otherwise-correct
`role="menuitem"` accessible name. Not blocking (the text label is present
and correct either way), but it is a concrete, verifiable deviation from the
architecture doc this component tree was built against.

**Fix:**

```tsx
<ArrowLeftRight className="mr-2 size-4" aria-hidden="true" />
```

(Same gap exists on the pre-existing, not-new-to-this-story `User`/`LogOut`
icons at `header.tsx:193`/`197` — out of scope for this story's finding, but
worth a follow-up sweep since it's the same root cause repo-wide.)

**Reference:** WCAG 1.1.1 (https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html).

---

### A11Y-003 — No Storybook interaction test exercises the composed DropdownMenu→Dialog close/focus-restore path

**Severity: Minor** (test-coverage gap, not itself a WCAG violation, but it is
the reason A11Y-001 shipped undetected)

**Component:** `src/components/layout/app-shell/header/header.stories.tsx`
(`MultiTenant` story, lines 62-80) and
`src/components/shared/tenant-card/tenant-switch-dialog.stories.tsx` (all
stories open the dialog via a plain `<button>` harness, never via a real
`DropdownMenu`).

**Issue:** `header.stories.tsx`'s `MultiTenant` story opens the real
DropdownMenu, clicks the real `menuitem`, and asserts the dialog opens — then
stops. Nothing in the story suite presses Escape or asserts
`document.activeElement` afterward for this specific composition, so the
Blocking bug in A11Y-001 has no regression guard.

**Fix:** Extend `MultiTenant`'s `play` function (or add a new
`MultiTenant_CloseRestoresFocus` story) to assert, after the fix in A11Y-001
lands:

```tsx
export const MultiTenant_CloseRestoresFocus: Story = {
  args: { /* same as MultiTenant */ },
  play: async ({ canvas }) => {
    const trigger = await canvas.findByRole("button", { name: "Menu người dùng" });
    await userEvent.click(trigger);
    const body = within(document.body);
    await userEvent.click(await body.findByRole("menuitem", { name: /Đổi trường/ }));
    const dialog = await body.findByRole("dialog");
    await expect(dialog).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await expect(body.queryByRole("dialog")).not.toBeInTheDocument();
    await expect(document.activeElement).toBe(trigger);
  },
};
```

**Reference:** `.claude/rules/tdd.md` (E2E/Story layer proof requirement),
`.claude/rules/accessibility.md` ("Test keyboard-only thủ công cho flow
chính").

## 4. Keyboard Navigation Map

| Step | Key | Expected | Actual (as shipped) |
| --- | --- | --- | --- |
| Header → avatar trigger | Tab | Focus reaches `aria-label="Menu người dùng"` button | OK |
| Open user menu | Enter/Space | `DropdownMenuContent` opens, `role=menu` | OK |
| Navigate to "Đổi trường" | ArrowDown/Tab | Highlights `role=menuitem` | OK |
| Activate | Enter/Space | Dialog opens, focus moves into dialog (first focusable node) | **FAIL — focus stays on/returns to the trigger button, outside the dialog** (A11Y-001) |
| Tab inside dialog | Tab/Shift+Tab | Loops among close button + cards (Radix focus-trap) | Not reachable from a pure-keyboard start because focus never entered the trap (A11Y-001); works fine if focus is manually placed inside first |
| Dismiss (idle) | Escape | Dialog closes, focus returns to `aria-label="Menu người dùng"` | **FAIL — dialog does not close** (A11Y-001) |
| Dismiss (busy) | Escape | Blocked (FR-006) | OK — confirmed by the shipped `DismissBlockedWhileBusy` story |
| Activate a card | Enter/Space | `aria-busy`, `role=status` region announces, card disables | OK |

## 5. Screen Reader Script

**"Đổi trường" menu item — before fix:** "Graphic. Đổi trường, menu item." (icon
noise) → **after A11Y-002 fix:** "Đổi trường, menu item."

**Opening the dialog — before fix (A11Y-001):** Nothing is announced as
having received focus inside the dialog; a screen-reader user hitting
Tab/Escape next interacts with whatever was already focused (the avatar
button), which is confusing and, on Escape, produces **no observable
change at all** — the user has no non-visual signal that the "Chọn trường"
dialog is even still open, and no way to close it without switching to
mouse/touch.

**After A11Y-001 fix:** "Chọn trường, dialog. Chọn trường bạn muốn chuyển
sang..." (title + description read on entry, per Radix `aria-labelledby`/
`aria-describedby` wiring already in `DialogTitle`/`DialogDescription`) →
Tab reaches the close button, then each card: "THPT Chu Văn An, 10 Thụy
Khuê, Tây Hồ, Hà Nội, vai trò Giáo viên, trường hiện tại, current." → Escape:
dialog closes, "Menu người dùng, button" is re-announced as focused.

**Activating a non-current card:** "Loading" region: "Đang chuyển…" announced
via the `role=status`/`aria-live=polite` region in `tenant-card.tsx:129-139`
— confirmed real `sr-only` (Tailwind utility), not `aria-hidden`/`display:none`.

**403 error:** `role="alert"` fires immediately, scoped to the one card:
"Không thể chuyển sang trường này. Bạn không còn là thành viên đang hoạt
động." — confirmed NOT a page-wide alert (it's a `<span>` inside that card's
own flex column, `tenant-card.tsx:118-125`).

## 6. Quick Wins (< 30 min)

1. **A11Y-002** — add `aria-hidden="true"` to the `ArrowLeftRight` icon,
   `header.tsx:188`. (~2 min)
2. **A11Y-001** — control `DropdownMenu`'s `open` state + defer the dialog
   open by one frame, `header.tsx`. (~20 min, see fix snippet above)
3. **A11Y-003** — add the `MultiTenant_CloseRestoresFocus` interaction
   assertion once #2 lands, so this exact regression is guarded going
   forward. (~10 min)

## 7. Quality Bar Checklist

- [x] Contrast verified against actual `tokens.css` values (`--edu-text-secondary`
      5.48:1 for the address line, `--edu-success-text`/`--edu-purple-text`/
      `--edu-teal-text` for tinted logo-box initials, `--edu-warning-foreground`
      pattern intact — no white-on-warning anywhere in this component tree)
- [x] All AA criteria relevant to the component checked
- [x] Keyboard flow documented step by step; Radix semantics verified —
      **found broken**, not intact, for the composed open path (A11Y-001)
- [x] Every finding has WCAG ref + evidence + concrete fix (with code)
- [x] Color-only status, missing labels, white-on-warning, and reduced-motion
      gaps explicitly checked — all PASS except the icon label gap (A11Y-002)
- [x] No code left modified — verified `git status --porcelain` clean after
      the reproduction/verification steps
