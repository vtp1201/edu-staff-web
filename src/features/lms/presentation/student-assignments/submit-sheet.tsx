"use client";

import { CheckSquare, Loader2, Send } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { AssignmentSummary } from "@/features/lms/domain/entities/assignment.entity";
import { useDialogReturnFocus } from "@/shared/use-dialog-return-focus";
import { cn } from "@/shared/utils";
import type {
  AssignmentDetailVm,
  AssignmentsErrorKey,
} from "./student-assignments-screen.i-vm";
import { useAssignmentDraft } from "./use-assignment-draft";

/** BE caps submission content at 20 000 runes (`LMS_SUBMISSION_CONTENT_TOO_LONG`). */
const MAX_CONTENT_LENGTH = 20_000;

export interface SubmitSheetProps {
  /** The list row that opened the sheet (title is available immediately). */
  row: AssignmentSummary;
  /** Full detail + the caller's own submission; `null` while loading. */
  detail: AssignmentDetailVm | null;
  detailLoading: boolean;
  detailErrorKey: AssignmentsErrorKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  submitErrorKey: AssignmentsErrorKey | null;
  onSubmit: (content: string) => void;
}

/**
 * Assignment detail + submit (US-E24.1).
 *
 * Three real changes from the pre-US-E24.1 sheet, all forced by the contract:
 * - the file-attachment field is gone — a submission is `{ content }`, text only;
 * - the "confirm late submission" dialog is gone — since BE US-228 a submit
 *   after `dueAt` is REJECTED (`409 LMS_ITEM_CLOSED`), so there is nothing to
 *   confirm; the sheet surfaces the refusal instead;
 * - "already submitted" is a real read (`.../submissions/me`), so the sheet
 *   switches to a read-only view of the submitted text rather than guessing
 *   from a list-row status.
 */
export function SubmitSheet({
  row,
  detail,
  detailLoading,
  detailErrorKey,
  open,
  onOpenChange,
  submitting,
  submitErrorKey,
  onSubmit,
}: SubmitSheetProps) {
  const t = useTranslations("assignments");
  const format = useFormatter();
  const { getDraft, saveDraft, clearDraft } = useAssignmentDraft(row.id);
  const restoreFocusOnClose = useDialogReturnFocus(open);

  const [content, setContent] = useState("");

  // Prefill from a saved draft whenever the sheet opens.
  useEffect(() => {
    if (!open) return;
    setContent(getDraft() ?? "");
  }, [open, getDraft]);

  const submitted = detail?.mySubmission ?? null;
  const isEmpty = content.trim().length === 0;
  const tooLong = content.length > MAX_CONTENT_LENGTH;
  const canSubmit =
    !submitting &&
    detail !== null &&
    submitted === null &&
    !isEmpty &&
    content.length <= MAX_CONTENT_LENGTH;

  const contentErrorId = `submit-content-error-${row.id}`;
  const emptyHintId = `submit-content-hint-${row.id}`;
  const submitErrorId = `submit-error-${row.id}`;
  // Everything the Textarea and the Submit button are described by, so a
  // disabled/failed submit is never silent to a screen reader.
  const describedBy =
    [
      tooLong ? contentErrorId : null,
      isEmpty && !submitErrorKey ? emptyHintId : null,
      submitErrorKey ? submitErrorId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const fmtDate = (iso: string) =>
    format.dateTime(new Date(iso), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        closeLabel={t("submit.closeAriaLabel")}
        className="w-full gap-0 sm:max-w-lg"
        onCloseAutoFocus={restoreFocusOnClose}
      >
        <SheetHeader className="border-border border-b">
          <SheetTitle className="font-extrabold text-[15px]">
            {t("submit.sheetTitle")}
          </SheetTitle>
          <SheetDescription>{row.title}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          {detailLoading ? (
            <>
              <span className="sr-only" role="status">
                {t("submit.detailLoading")}
              </span>
              <div className="space-y-2.5" aria-hidden="true">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </>
          ) : detailErrorKey || detail === null ? (
            <p role="alert" className="text-edu-error-text text-sm">
              {t(`errors.${detailErrorKey ?? "unknown"}`)}
            </p>
          ) : (
            <>
              <p className="whitespace-pre-line text-edu-text-secondary text-sm leading-relaxed">
                {detail.assignment.instructions ?? t("submit.noInstructions")}
              </p>
              <p className="mt-3 text-edu-text-secondary text-xs">
                {detail.assignment.dueAt
                  ? t("card.dueDate", {
                      date: fmtDate(detail.assignment.dueAt),
                    })
                  : t("card.noDueDate")}
              </p>

              {submitted ? (
                <div className="mt-5 space-y-2 rounded-[10px] border border-border bg-edu-bg p-4">
                  <p className="flex items-center gap-1.5 font-bold text-edu-success-text text-xs">
                    <CheckSquare className="size-3.5" aria-hidden="true" />
                    {t("submit.submittedAt", {
                      date: fmtDate(submitted.submittedAt),
                    })}
                  </p>
                  <p className="whitespace-pre-line text-foreground text-sm leading-relaxed">
                    {submitted.content}
                  </p>
                </div>
              ) : (
                <div className="mt-5">
                  <label
                    htmlFor={`submit-content-${row.id}`}
                    className="mb-2 block font-bold text-edu-text-secondary text-xs uppercase tracking-wide"
                  >
                    {t("submit.answerLabel")}
                  </label>
                  <Textarea
                    id={`submit-content-${row.id}`}
                    rows={8}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t("submit.answerPlaceholder")}
                    aria-invalid={tooLong || undefined}
                    aria-describedby={describedBy}
                  />
                  {tooLong && (
                    <p
                      id={contentErrorId}
                      role="alert"
                      className="mt-1.5 text-edu-error-text text-xs"
                    >
                      {t("submit.contentTooLong", { max: MAX_CONTENT_LENGTH })}
                    </p>
                  )}
                  {isEmpty && !submitErrorKey && (
                    <p
                      id={emptyHintId}
                      className="mt-1.5 text-edu-text-secondary text-xs"
                    >
                      {t("submit.emptyContentHint")}
                    </p>
                  )}
                  <p className="mt-1.5 text-edu-text-secondary text-xs">
                    {t("submit.singleAttemptHelper")}
                  </p>
                </div>
              )}

              {submitErrorKey && (
                <p
                  id={submitErrorId}
                  role="alert"
                  className="mt-3 text-edu-error-text text-sm"
                >
                  {t(`errors.${submitErrorKey}`)}
                </p>
              )}
            </>
          )}
        </div>

        {detail !== null && submitted === null && (
          <SheetFooter className="flex-row gap-2 border-border border-t">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={submitting}
              onClick={() => {
                saveDraft(content);
                toast.success(t("submit.draftSavedToast"));
              }}
            >
              {t("submit.saveDraftButton")}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!canSubmit}
              aria-describedby={describedBy}
              onClick={() => {
                onSubmit(content.trim());
                clearDraft();
              }}
            >
              {submitting ? (
                <Loader2
                  className={cn("size-4 motion-safe:animate-spin")}
                  aria-hidden="true"
                />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
              {submitting
                ? t("submit.submittingButton")
                : t("submit.submitButton")}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
