"use client";

import { AlertTriangle, Check, Loader2, ShieldAlert } from "lucide-react";
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
 * Optional inline error slot rendered between body and footer (added US-E09.6 for
 * the one-way flag confirm, which must surface `forbidden`/`invalid-state`
 * without closing). Absent = no behaviour change for existing consumers.
 *
 * Mirrors `DestructiveConfirmDialog`'s already-proven `errorSlot` contract:
 * `blocked` force-disables confirm (re-clicking can only fail again — the only
 * way out is Cancel); `transient` leaves confirm enabled so the same click
 * retries. Tone-differentiated by BOTH icon and colour, never colour alone.
 */
export interface PublishConfirmErrorSlot {
  tone: "blocked" | "transient";
  /** Already-i18n'd message text (caller owns i18n). */
  message: string;
}

export interface PublishConfirmDialogProps {
  open: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  labels: {
    title: string;
    body: string;
    confirm: string;
    publishing: string;
    cancel: string;
  };
  /**
   * Inline error slot. Host owns clearing it on re-open / after success (same
   * rule as `isLoading`).
   */
  errorSlot?: PublishConfirmErrorSlot;
}

/** Tone → icon + text/bg classes (icon + colour, never colour-only). */
const ERROR_SLOT_TONE = {
  blocked: {
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
 * One-way publish confirm. Non-destructive tone (check icon + primary button,
 * NOT the destructive variant — publishing is a positive action). Do NOT reuse
 * `DestructiveConfirmDialog` for this flow — that component's red/destructive
 * tone is semantically wrong for a positive one-way action.
 *
 * Promoted from `features/lesson-plan/presentation/lesson-plan-builder-screen/
 * publish-confirm-dialog.tsx` (US-E11.9, component-organization.md decision
 * 0026) — `question-bank` is the 2nd consumer.
 *
 * Plain `Button`s (not `AlertDialogAction`) so the confirm callback fires
 * exactly once and the dialog stays OPEN with a spinner while the publish PUT
 * is in flight; the caller's hook closes it on the result. Escape/overlay
 * routes to `onCancel` (no request fires).
 */
export function PublishConfirmDialog({
  open,
  isLoading,
  onConfirm,
  onCancel,
  labels,
  errorSlot,
}: PublishConfirmDialogProps) {
  const slotTone = errorSlot ? ERROR_SLOT_TONE[errorSlot.tone] : undefined;
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isLoading) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/14 text-primary"
            >
              <Check className="size-5" />
            </span>
            <div className="min-w-0">
              <AlertDialogTitle>{labels.title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-1.5">
                {labels.body}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        {errorSlot && slotTone && (
          <p
            role="alert"
            className={cn(
              "flex items-start gap-1.5 rounded-[var(--edu-radius-btn)] px-3 py-2.5 text-sm",
              slotTone.bg,
              slotTone.text,
            )}
          >
            <slotTone.Icon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            {errorSlot.message}
          </p>
        )}
        <AlertDialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            {labels.cancel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            aria-busy={isLoading}
            disabled={isLoading || errorSlot?.tone === "blocked"}
          >
            {isLoading ? (
              <Loader2
                className="mr-1.5 size-4 motion-safe:animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Check className="mr-1.5 size-4" aria-hidden="true" />
            )}
            {isLoading ? labels.publishing : labels.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
