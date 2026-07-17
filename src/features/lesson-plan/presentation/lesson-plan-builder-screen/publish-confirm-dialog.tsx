"use client";

import { Check, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

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
}

/**
 * One-way publish confirm (FR-004). Non-destructive tone (check icon + primary
 * button, NOT the destructive variant — publishing is a positive action, D4).
 * Feature-local for this US (fe-lead deferred promoting exam-bank's dialog).
 *
 * Plain `Button`s (not `AlertDialogAction`) so the confirm callback fires
 * exactly once and the dialog stays OPEN with a spinner while the publish PUT is
 * in flight (AC-004.2); the hook closes it on the result. Escape/overlay routes
 * to `onCancel` (no request fires, AC-004.4).
 */
export function PublishConfirmDialog({
  open,
  isLoading,
  onConfirm,
  onCancel,
  labels,
}: PublishConfirmDialogProps) {
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
            disabled={isLoading}
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
