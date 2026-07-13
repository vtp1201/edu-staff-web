"use client";

import { AlertTriangle, Flag, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/utils";
import {
  REPORT_REASON_IDS,
  type ReportContentDialogProps,
  type ReportReasonId,
} from "./report-content-dialog.i-props";
import {
  isReportSubmittable,
  reasonRequiresNote,
} from "./report-content-dialog.logic";

/**
 * Shared Report-content dialog (US-E19.2, FR-101). ONE implementation reused
 * verbatim by the feed (US-E19.1) and, later, messaging (US-E10.6) — those
 * callers each wrap it with their own thin `'use server'` action that invokes
 * `bootstrap/di/moderation.di.ts::makeSubmitReportUseCase()`. This component is
 * pure presentation: host-controlled `open` + async state (`isSubmitting`,
 * `fieldError`/`transientError`/`infoMessage`), it never imports DI or calls
 * HTTP. Built on the Radix `Dialog` primitive → focus-trap, Escape,
 * return-focus-on-close, `role="dialog"`/`aria-modal` are inherited.
 *
 * `contentId` is intentionally NOT a prop — the host captured it when it
 * invoked the dialog and re-supplies it inside its own `onSubmit` closure,
 * keeping this component identity-agnostic.
 */
export function ReportContentDialog({
  open,
  kind,
  authorName,
  contentPreview,
  isSubmitting,
  fieldError,
  transientError,
  infoMessage,
  onSubmit,
  onCancel,
}: ReportContentDialogProps) {
  const t = useTranslations("moderation.reportDialog");

  const [reason, setReason] = useState<ReportReasonId | null>(null);
  const [note, setNote] = useState("");

  // Reset internal selection whenever the dialog re-opens (false → true) — a
  // re-open must start from a clean radiogroup/note, never show the previous
  // submission's leftover state. React "adjust state on prop change" pattern
  // (reset during render, so the stale value never paints for a frame).
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setReason(null);
      setNote("");
    }
  }

  const submittable = isReportSubmittable(reason, note);
  const showNote = reasonRequiresNote(reason);

  const handleSubmit = () => {
    if (!submittable || !reason || isSubmitting) return;
    onSubmit(reason === "other" ? { reason, note: note.trim() } : { reason });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[430px]">
        <DialogHeader className="flex-row items-start gap-2.5 space-y-0 p-5 pb-0">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-[var(--edu-radius-btn)] bg-edu-warning/15"
          >
            <Flag className="size-4 text-edu-warning-foreground" />
          </span>
          <div className="min-w-0 flex-1 text-left">
            <DialogTitle className="font-extrabold text-[15px] text-foreground">
              {t("title")}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-muted-foreground text-xs">
              {t("subtitle", { kind: t(`kinds.${kind}`), authorName })}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          {/* Quoted preview of the reported content, clamped to 3 lines. */}
          <figure className="rounded-[var(--edu-radius-btn)] border border-border bg-muted/50 px-3 py-2.5">
            <figcaption className="font-bold text-[11px] text-muted-foreground">
              {authorName}
            </figcaption>
            <blockquote className="mt-1 line-clamp-3 text-edu-text-secondary text-[13px] leading-relaxed">
              {contentPreview}
            </blockquote>
          </figure>

          <RadioGroup
            aria-label={t("reasonGroupLabel")}
            value={reason ?? ""}
            onValueChange={(v) => setReason(v as ReportReasonId)}
            className="gap-2"
          >
            {REPORT_REASON_IDS.map((id) => {
              const active = reason === id;
              return (
                <Label
                  key={id}
                  htmlFor={`report-reason-${id}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-[9px] border px-3 py-2.5 font-medium text-[13px] transition-colors",
                    active
                      ? "border-primary bg-primary/5 font-bold text-primary"
                      : "border-border text-foreground",
                  )}
                >
                  <RadioGroupItem value={id} id={`report-reason-${id}`} />
                  {t(`reasons.${id}`)}
                </Label>
              );
            })}
          </RadioGroup>

          {showNote && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-note" className="sr-only">
                {t("noteLabel")}
              </Label>
              <Textarea
                id="report-note"
                rows={3}
                aria-required="true"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("notePlaceholder")}
              />
            </div>
          )}

          {/* Mutually-exclusive inline slot — host sets at most one. */}
          {fieldError && (
            <p
              aria-live="polite"
              className="flex items-start gap-1.5 text-edu-error-text text-sm"
            >
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              {fieldError.message}
            </p>
          )}
          {transientError && (
            <div
              aria-live="polite"
              className="flex flex-col gap-2 rounded-[var(--edu-radius-btn)] bg-edu-error/10 px-3 py-2.5"
            >
              <p className="flex items-start gap-1.5 text-edu-error-text text-sm">
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0"
                />
                {transientError.message}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="self-start"
                onClick={transientError.onRetry}
              >
                {t("retry")}
              </Button>
            </div>
          )}
          {infoMessage && (
            <p
              aria-live="polite"
              className="flex items-start gap-1.5 rounded-[var(--edu-radius-btn)] bg-edu-info/10 px-3 py-2.5 text-edu-text-primary text-sm"
            >
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {infoMessage}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 border-border border-t bg-muted/50 p-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!submittable || isSubmitting}
            aria-busy={isSubmitting}
          >
            <Flag aria-hidden="true" className="size-4" />
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
