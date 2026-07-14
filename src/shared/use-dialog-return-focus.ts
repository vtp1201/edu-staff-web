"use client";

import { useRef } from "react";

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
export function useDialogReturnFocus(open: boolean): (event: Event) => void {
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
    // Radix's default here would focus <body>; override to return to the invoker.
    if (invokerRef.current) {
      event.preventDefault();
      invokerRef.current.focus();
    }
  };
}
