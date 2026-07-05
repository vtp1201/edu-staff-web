"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { type Ref, useRef } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export interface DestructiveConfirmDialogProps {
  /** Controlled visibility. Parent owns open/close. */
  open: boolean;
  /** Title copy — resolved by the caller (no i18n inside this component). */
  title: string;
  /** Body copy — resolved by the caller. */
  body: string;
  /** Confirm-button copy — resolved by the caller. */
  confirmLabel: string;
  /** When true both buttons are disabled and confirm is `aria-busy`. */
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Pure, portal-free footer. Extracted so the repo's node-env Vitest can prove
 * the disabled / aria-busy / destructive-variant / cancel-left-confirm-right
 * contract via static markup — Radix portal content does not render on the
 * server, so the full dialog's interaction is proven in Storybook instead.
 *
 * Plain `<Button>`s (not `AlertDialogAction`/`AlertDialogCancel`) are used on
 * purpose: Radix's auto-close would fire `onOpenChange(false)` → `onCancel` in
 * addition to `onConfirm`, breaking the "each callback fires exactly once"
 * contract. Escape / overlay-click still route through `onCancel` via
 * `onOpenChange`. Enter/Space on a focused button use native activation.
 */
export function DestructiveDialogActions({
  confirmLabel,
  cancelLabel,
  isLoading,
  onConfirm,
  onCancel,
  cancelRef,
}: {
  confirmLabel: string;
  cancelLabel: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Forwarded so the dialog can move initial focus here on open (a11y). */
  cancelRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <>
      <Button
        ref={cancelRef}
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isLoading}
      >
        {cancelLabel}
      </Button>
      <Button
        type="button"
        variant="destructive"
        onClick={onConfirm}
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {confirmLabel}
      </Button>
    </>
  );
}

/**
 * Canonical destructive-confirmation dialog (design-spec.jsonc
 * #interactionPatterns.destructiveConfirmDialog). Built on the shadcn/Radix
 * `AlertDialog` primitive → `role="alertdialog"`, focus trap, focus restore to
 * the trigger, and `aria-labelledby`/`aria-describedby` wiring are inherited.
 */
export function DestructiveConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  isLoading = false,
  onConfirm,
  onCancel,
}: DestructiveConfirmDialogProps) {
  const tCommon = useTranslations("Common");
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialogContent
        className="max-h-[92vh] overflow-y-auto"
        // We render plain <Button>s (not AlertDialogCancel), so Radix's default
        // onOpenAutoFocus → cancelRef.current?.focus() is a no-op. Move initial
        // focus to our cancel button explicitly (WCAG 2.4.3 / 2.1.2).
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          cancelRef.current?.focus();
        }}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle
              aria-hidden="true"
              className="size-5 shrink-0 text-edu-error-text"
            />
            <AlertDialogTitle className="text-base font-bold text-foreground">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-edu-text-secondary">
            {body}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <DestructiveDialogActions
            confirmLabel={confirmLabel}
            cancelLabel={tCommon("confirmDialog.cancel")}
            isLoading={isLoading}
            onConfirm={onConfirm}
            onCancel={onCancel}
            cancelRef={cancelRef}
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
