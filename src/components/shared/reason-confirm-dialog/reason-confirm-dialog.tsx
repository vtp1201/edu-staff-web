"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDialogReturnFocus } from "@/shared/use-dialog-return-focus";
import { cn } from "@/shared/utils";
import { validateReason } from "./validate-reason";

export interface ReasonConfirmDialogProps {
  /** Controlled visibility — the parent owns open/close. */
  open: boolean;
  /** Dialog title — resolved by the caller (no i18n inside this component). */
  title: string;
  /** Optional supporting copy explaining the consequence of confirming. */
  description?: string;
  /** Visible label of the reason field (also its accessible name). */
  reasonLabel: string;
  reasonPlaceholder?: string;
  /** Confirm-button copy. */
  confirmLabel: string;
  /** Cancel-button copy. Defaults to `Common.confirmDialog.cancel`. */
  cancelLabel?: string;
  /**
   * Hard cap on the TRIMMED reason length (server-enforced too). Omit ONLY when
   * the field genuinely has no documented maximum — do not invent one.
   */
  maxLength?: number;
  /**
   * Opt-in floor on the TRIMMED length, for a reason that must be ACTIONABLE
   * (e.g. a grade-revision note telling a teacher what to fix). Omitted ⇒ any
   * non-empty reason is accepted. Pair it with `tooShortMessage`.
   */
  minLength?: number;
  /** Message shown when the reason is empty. */
  requiredMessage: string;
  /** Message shown when the reason is shorter than `minLength`. */
  tooShortMessage?: string;
  /** Message shown when the reason exceeds `maxLength`. Required with it. */
  tooLongMessage?: string;
  /** `count/max` hint under the field — caller formats it (i18n + ICU). */
  formatCounter?: (count: number) => string;
  /** Disables both actions and marks confirm `aria-busy`. */
  isPending?: boolean;
  /**
   * Already-i18n'd server-failure copy, rendered as an inline `role="alert"`
   * (icon + text, never colour-only). Host owns clearing it on re-open.
   */
  errorMessage?: string | null;
  onConfirm: (reason: string) => void;
  onOpenChange: (open: boolean) => void;
}

/**
 * Canonical "confirm this destructive-ish action, and say WHY" dialog
 * (US-E18.44). A required free-text reason is a recurring pattern in this app
 * (reject a leave request, request a grade revision, reject a grade entry), and
 * per `component-organization.md` / decision 0026 the composed shape lives in
 * ONE canonical home instead of being re-forked per feature. Copy is 100%
 * caller-owned (props), so each screen keeps its own i18n namespace.
 *
 * The reason is plain text rendered/stored as-is — it is passed to `onConfirm`
 * untouched apart from trimming, and every consumer renders it back as a JSX
 * text node (React escapes it). NEVER `dangerouslySetInnerHTML`.
 *
 * a11y: `<Label htmlFor>` link, `aria-required`, `aria-invalid`, and
 * `aria-describedby` pointing at the counter + the active error; the error uses
 * `role="alert"` and text (not colour) to carry meaning; confirm is disabled
 * while invalid so keyboard users cannot submit a blank reason; focus returns
 * to the invoking control on close.
 */
export function ReasonConfirmDialog({
  open,
  title,
  description,
  reasonLabel,
  reasonPlaceholder,
  confirmLabel,
  cancelLabel,
  maxLength,
  minLength,
  requiredMessage,
  tooShortMessage,
  tooLongMessage,
  formatCounter,
  isPending = false,
  errorMessage,
  onConfirm,
  onOpenChange,
}: ReasonConfirmDialogProps) {
  const tCommon = useTranslations("Common");
  const fieldId = useId();
  const errorId = useId();
  const counterId = useId();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const returnFocus = useDialogReturnFocus(open);

  // Reset on close so re-opening never inherits the previous reason.
  useEffect(() => {
    if (!open) {
      setReason("");
      setTouched(false);
    }
  }, [open]);

  const validity = validateReason(reason, maxLength, minLength);
  const invalid = validity !== "ok";
  const showValidation = touched && invalid;
  const validationMessage =
    validity === "too-long"
      ? (tooLongMessage ?? requiredMessage)
      : validity === "too-short"
        ? (tooShortMessage ?? requiredMessage)
        : requiredMessage;
  const counterText = formatCounter?.(reason.trim().length);

  const describedBy =
    [
      counterText ? counterId : null,
      showValidation || errorMessage ? errorId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] overflow-y-auto"
        onCloseAutoFocus={returnFocus}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-sm text-edu-text-secondary">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={fieldId}>{reasonLabel}</Label>
          <Textarea
            id={fieldId}
            rows={4}
            value={reason}
            placeholder={reasonPlaceholder}
            aria-required="true"
            aria-invalid={showValidation}
            aria-describedby={describedBy}
            disabled={isPending}
            onChange={(e) => {
              setReason(e.target.value);
              setTouched(true);
            }}
          />
          {counterText ? (
            <span
              id={counterId}
              className={cn(
                "text-xs text-muted-foreground",
                validity === "too-long" && "text-edu-error-text",
              )}
            >
              {counterText}
            </span>
          ) : null}
          {showValidation || errorMessage ? (
            <p
              id={errorId}
              role="alert"
              className="flex items-start gap-1.5 text-edu-error-text text-xs"
            >
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0"
              />
              {showValidation ? validationMessage : errorMessage}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {cancelLabel ?? tCommon("confirmDialog.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={invalid || isPending}
            aria-busy={isPending}
            onClick={() => onConfirm(reason.trim())}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
