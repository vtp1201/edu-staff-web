# US-E12.11 — Component Architecture

## Tree
```
AdminSettingsPage (RSC)                          app/.../admin/settings/page.tsx
  prefetch repo.getOperationalSettings()
  └─ AdminSettingsScreen ('use client')          features/admin-settings/presentation/
       props: { initialMode, loading?, isReadOnly?, onUpdateMode }
       ├─ Section 1: Grade Publish Mode
       │    └─ <fieldset><legend.sr-only> + 2 × <label><input type=radio>
       │       warning note (role="note")
       │       Save <button> (disabled !isDirty | saving | isReadOnly)
       ├─ Section 2: Config shortcuts
       │    └─ 2 × next/link card → /admin/calendar, /admin/assessment
       └─ SwitchConfirmDialog ('use client')     shadcn AlertDialog
            shown only on ADMIN_APPROVAL → SELF_PUBLISH
  toast: sonner (success/error)
```

## ViewModel
`admin-settings-screen.i-vm.ts` documents the screen's data shape
(`currentMode`, `loading`, `errorKey`, `isReadOnly`). The screen consumes
primitives via props rather than a single VM object (RSC-initial-data pattern).

## Component placement
All components are single-screen → live in
`features/admin-settings/presentation/admin-settings-screen/`. Reuse existing
primitives (`alert-dialog`, `skeleton`, `sonner`); no new shared/ui component.

## A11y
- Radio group is a real `<fieldset>` + `<legend className="sr-only">` (AC-8).
- Each option is a `<label>` wrapping `<input type="radio">` — keyboard native.
- Save button ≥44px touch target, visible focus ring (`--ring`).
- AlertDialog (Radix) traps focus and is keyboard-dismissable.
- Warning conveyed by icon + text, not color alone.
