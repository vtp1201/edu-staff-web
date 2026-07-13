"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
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
import { cn } from "@/shared/utils";

/**
 * Optional inline error slot rendered between body and footer (US-E19.2, added
 * for the confirm-remove flow). Absent = no behavior change from before.
 * Tone-differentiated by BOTH icon and color (never color-only, NFR-102).
 */
export interface DestructiveConfirmErrorSlot {
  tone: "forbidden" | "transient";
  /** Already-i18n'd message text (caller owns i18n). */
  message: string;
  /**
   * Retry callback. STRUCTURALLY ignored when `tone === "forbidden"` — the
   * component never mounts a retry control for that tone regardless of whether
   * onRetry is passed. Callers SHOULD omit it for `forbidden`.
   */
  onRetry?: () => void;
}

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
  /**
   * Inline error slot (US-E19.2). `forbidden` tone force-disables the confirm
   * button and never shows a retry; `transient` shows a retry and leaves confirm
   * enabled. Host owns clearing it on re-open / after success (same rule as
   * `isLoading`).
   */
  errorSlot?: DestructiveConfirmErrorSlot;
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
  confirmDisabled = false,
  onConfirm,
  onCancel,
  cancelRef,
}: {
  confirmLabel: string;
  cancelLabel: string;
  isLoading: boolean;
  /**
   * Force-disable confirm independent of `isLoading` (US-E19.2). Used for the
   * `forbidden` error tone so a user cannot bypass "no retry" by re-clicking
   * the primary action. Cancel stays enabled — the only way out is to close.
   */
  confirmDisabled?: boolean;
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
        disabled={isLoading || confirmDisabled}
        aria-busy={isLoading}
      >
        {confirmLabel}
      </Button>
    </>
  );
}

/** Tone → icon + text/bg classes (icon+color, never color-only, NFR-102). */
const ERROR_SLOT_TONE = {
  forbidden: {
    Icon: ShieldAlert,
    text: "text-edu-error-text",
    bg: "bg-edu-error/10",
  },
  transient: {
    Icon: AlertTriangle,
    text: "text-edu-warning-foreground",
    bg: "bg-edu-warning/15",
  },
} as const;

/**
 * Inline error slot for the confirm dialog (US-E19.2). `role="alert"` so the
 * failed destructive action is announced assertively. A retry button renders
 * ONLY for the `transient` tone — never for `forbidden` (structural: the
 * `forbidden` branch has no retry element at all, not merely a hidden one).
 */
function DestructiveErrorSlot({
  errorSlot,
  retryLabel,
}: {
  errorSlot: DestructiveConfirmErrorSlot;
  retryLabel: string;
}) {
  const { Icon, text, bg } = ERROR_SLOT_TONE[errorSlot.tone];
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-2 rounded-[var(--edu-radius-btn)] px-3 py-2.5",
        bg,
      )}
    >
      <p className={cn("flex items-start gap-1.5 text-sm", text)}>
        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {errorSlot.message}
      </p>
      {errorSlot.tone === "transient" && errorSlot.onRetry && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="self-start"
          onClick={errorSlot.onRetry}
        >
          {retryLabel}
        </Button>
      )}
    </div>
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
  errorSlot,
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
        {errorSlot && (
          <DestructiveErrorSlot
            errorSlot={errorSlot}
            retryLabel={tCommon("confirmDialog.retry")}
          />
        )}
        <AlertDialogFooter>
          <DestructiveDialogActions
            confirmLabel={confirmLabel}
            cancelLabel={tCommon("confirmDialog.cancel")}
            isLoading={isLoading}
            confirmDisabled={errorSlot?.tone === "forbidden"}
            onConfirm={onConfirm}
            onCancel={onCancel}
            cancelRef={cancelRef}
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
