"use client";

import { type RefObject, useRef } from "react";

/**
 * Restore focus to the control that opened a CONTROLLED Radix Dialog/Sheet/
 * AlertDialog when it closes.
 *
 * Radix's modal `Content` overrides `onCloseAutoFocus` to focus
 * `context.triggerRef` — a ref populated ONLY by a mounted `<Trigger>`. A dialog
 * driven purely by `open`/`onOpenChange` (no `<Trigger>` wrapping the CTA) leaves
 * that ref `null`, so on close Radix focuses nothing and focus falls through to
 * `<body>` instead of returning to the CTA (fails WCAG 2.4.3 focus order).
 *
 * This snapshots `document.activeElement` during the render where `open` flips to
 * `true` — which is BEFORE Radix's focus-trap layout effect moves focus into the
 * dialog, so the snapshot is the true invoker — and returns an `onCloseAutoFocus`
 * handler that restores focus to it. `prevOpenRef` starts `false` so a dialog that
 * mounts already-open (`open={true}` on first render, e.g. a conditionally
 * rendered sheet) still captures its invoker.
 */
/**
 * PRIMITIVE-level variant of {@link useDialogReturnFocus}, for a Radix
 * `Content` that has no access to the `open` flag.
 *
 * Why the `open`-based hook cannot be used there: a `Content` is normally
 * rendered UNCONDITIONALLY inside its `Root` (only Radix's `Presence` decides
 * whether it mounts), so the component function first renders while the dialog
 * is still CLOSED — snapshotting `document.activeElement` then captures
 * `<body>`, and "restoring" focus to `<body>` on close is worse than doing
 * nothing: it also suppresses Radix's own `triggerRef` restore. Measured, not
 * theorised (US-E18.32: a `<SheetTrigger>`-based sheet lost its focus restore).
 *
 * Instead, snapshot on Radix's `onOpenAutoFocus`, which FocusScope dispatches
 * BEFORE it moves focus into the content — so `document.activeElement` is still
 * the true invoker. Neither handler prevents Radix's default unless we really
 * have an invoker to return to, so trigger-based dialogs keep their built-in
 * behaviour.
 */
export function useAutoFocusReturn(): {
  onOpenAutoFocus: (event: Event) => void;
  onCloseAutoFocus: (event: Event) => void;
} {
  const invokerRef = useRef<HTMLElement | null>(null);

  return {
    onOpenAutoFocus: () => {
      const active = document.activeElement;
      invokerRef.current =
        active instanceof HTMLElement && active !== document.body
          ? active
          : null;
      // Deliberately NO preventDefault — Radix still focuses the content.
    },
    onCloseAutoFocus: (event: Event) => {
      const invoker = invokerRef.current;
      invokerRef.current = null;
      // A detached invoker (its row was removed while the dialog was open) is
      // unfocusable — fall through to Radix's own restore instead.
      if (!invoker?.isConnected) return;
      event.preventDefault();
      invoker.focus();
    },
  };
}

/**
 * @param fallbackRef Focus target used when the invoker is DETACHED by the time
 * the dialog closes — the row that owned the invoking button was removed as a
 * result of confirming (an inbox that drops a decided request, US-E24.11).
 * Without it, `focus()` on a detached node is a silent no-op and focus falls to
 * `<body>` (fails WCAG 2.4.3); pass a `tabIndex={-1}` heading of the surviving
 * container instead.
 */
export function useDialogReturnFocus(
  open: boolean,
  fallbackRef?: RefObject<HTMLElement | null>,
): (event: Event) => void {
  const invokerRef = useRef<HTMLElement | null>(null);
  const prevOpenRef = useRef(false);
  if (open && !prevOpenRef.current && typeof document !== "undefined") {
    invokerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }
  prevOpenRef.current = open;

  return (event: Event) => {
    // Radix's default here would focus <body>; override to return to the
    // invoker — or, when the invoker no longer exists, to the caller's fallback.
    const invoker = invokerRef.current;
    const target = invoker?.isConnected
      ? invoker
      : (fallbackRef?.current ?? null);
    if (target) {
      event.preventDefault();
      target.focus();
    }
  };
}
