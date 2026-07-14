"use client";

import { Loader2, Paperclip, Send, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import type {
  AssignmentEntity,
  SubmitAssignmentInput,
} from "@/features/lms/domain/entities/assignment.entity";
import type { AssignmentFailure } from "@/features/lms/domain/failures/assignment.failure";
import { isOverdue } from "@/features/lms/domain/use-cases/derive-overdue";
import { useDialogReturnFocus } from "@/shared/use-dialog-return-focus";
import { cn } from "@/shared/utils";
import { OverdueConfirmDialog } from "./overdue-confirm-dialog";
import { useAssignmentDraft } from "./use-assignment-draft";

/** 20MB client-side attachment cap (FR-005) — validated on "Nộp bài" only. */
const MAX_FILE_BYTES = 20 * 1024 * 1024;

export interface SubmitSheetProps {
  assignment: AssignmentEntity;
  /** "edit" = pending (submittable); "readonly" = already-submitted view. */
  mode: "edit" | "readonly";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  submitErrorKey: AssignmentFailure["type"] | null;
  onSubmit: (input: SubmitAssignmentInput) => void;
}

export function SubmitSheet({
  assignment,
  mode,
  open,
  onOpenChange,
  submitting,
  submitErrorKey,
  onSubmit,
}: SubmitSheetProps) {
  const t = useTranslations("assignments");
  const format = useFormatter();
  const { getDraft, saveDraft, clearDraft } = useAssignmentDraft(assignment.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreFocusOnClose = useDialogReturnFocus(open);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [fileTooLarge, setFileTooLarge] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Prefill from a saved draft whenever the edit sheet opens.
  useEffect(() => {
    if (!open) return;
    setFileTooLarge(false);
    setSelectedFile(null);
    if (mode === "edit") {
      const draft = getDraft();
      setAnswerText(draft?.answerText ?? "");
      setFileName(draft?.fileName ?? null);
    } else {
      setAnswerText("");
      setFileName(null);
    }
  }, [open, mode, getDraft]);

  const fmtDate = (iso: string) =>
    format.dateTime(new Date(iso), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    setSelectedFile(file);
    setFileName(file.name);
    setFileTooLarge(false);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileName(null);
    setFileTooLarge(false);
  };

  const canSubmit =
    mode === "edit" &&
    !submitting &&
    Boolean(fileName || answerText.trim().length > 0);

  const doSubmit = (overdueConfirmed: boolean) => {
    onSubmit({
      answerText: answerText.trim() || undefined,
      fileName: fileName ?? undefined,
      overdueConfirmed,
    });
    clearDraft();
  };

  const onSubmitClick = () => {
    setFileTooLarge(false);
    // File-too-large blocks ONLY submit (not draft) and never round-trips.
    if (selectedFile && selectedFile.size > MAX_FILE_BYTES) {
      setFileTooLarge(true);
      return;
    }
    // Overdue is recomputed at click-time, not at sheet-open (AC-1176.6).
    if (isOverdue(assignment.status, assignment.dueDate, new Date())) {
      setConfirmOpen(true);
      return;
    }
    doSubmit(false);
  };

  const onSaveDraft = () => {
    saveDraft({
      answerText: answerText.trim() || undefined,
      fileName: fileName ?? undefined,
    });
    toast.success(t("submit.draftSavedToast"));
  };

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
          <SheetDescription>
            {t("card.meta", {
              subject: assignment.subject,
              className: assignment.className,
              teacherName: assignment.teacherName,
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <h3 className="font-bold text-foreground text-sm">
            {t("card.title", { title: assignment.title })}
          </h3>
          <p className="mt-1.5 whitespace-pre-line text-edu-text-secondary text-sm leading-relaxed">
            {assignment.description}
          </p>
          <p
            className={cn(
              "mt-3 text-xs",
              isOverdue(assignment.status, assignment.dueDate, new Date())
                ? "font-bold text-edu-error-text"
                : "text-edu-text-secondary",
            )}
          >
            {t("card.dueDate", { date: fmtDate(assignment.dueDate) })}
          </p>

          {mode === "readonly" ? (
            <div className="mt-5 space-y-3 rounded-[10px] border border-border bg-edu-bg p-4">
              {assignment.submittedAt && (
                <p className="text-edu-text-secondary text-xs">
                  {t("submit.fileSelectedLabel", {
                    fileName: assignment.fileName ?? "—",
                  })}
                </p>
              )}
              {assignment.answerText && (
                <p className="whitespace-pre-line text-foreground text-sm leading-relaxed">
                  {assignment.answerText}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div>
                <p
                  id={`attach-label-${assignment.id}`}
                  className="mb-2 font-bold text-edu-text-secondary text-xs uppercase tracking-wide"
                >
                  {t("submit.attachLabel")}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  aria-labelledby={`attach-label-${assignment.id}`}
                  onChange={onPickFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="size-4" aria-hidden="true" />
                  {t("submit.attachPlaceholder")}
                </Button>
                <p className="mt-1.5 text-edu-text-secondary text-xs">
                  {t("submit.attachHelper")}
                </p>

                {fileName && (
                  <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
                    <Paperclip
                      className="size-3.5 shrink-0 text-edu-primary-accessible"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-foreground text-sm">
                      {fileName}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("submit.attachRemoveAriaLabel")}
                      onClick={removeFile}
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                )}

                {fileTooLarge && (
                  <p role="alert" className="mt-2 text-edu-error-text text-xs">
                    {t("errors.file-too-large")}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor={`answer-${assignment.id}`}
                  className="mb-2 block font-bold text-edu-text-secondary text-xs uppercase tracking-wide"
                >
                  {t("submit.answerLabel")}
                </label>
                <Textarea
                  id={`answer-${assignment.id}`}
                  rows={6}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder={t("submit.answerPlaceholder")}
                />
                <p className="mt-1.5 text-edu-text-secondary text-xs">
                  {t("submit.answerHelper")}
                </p>
              </div>

              {submitErrorKey && (
                <p role="alert" className="text-edu-error-text text-sm">
                  {t(`errors.${submitErrorKey}`)}
                </p>
              )}
            </div>
          )}
        </div>

        {mode === "edit" && (
          <SheetFooter className="flex-row justify-end gap-2 border-border border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={onSaveDraft}
              disabled={submitting}
            >
              {t("submit.saveDraftButton")}
            </Button>
            <Button
              type="button"
              onClick={onSubmitClick}
              disabled={!canSubmit}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <Loader2
                    className="size-4 motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                  {t("submit.submittingButton")}
                </>
              ) : (
                <>
                  <Send className="size-4" aria-hidden="true" />
                  {t("submit.submitButton")}
                </>
              )}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>

      <OverdueConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => {
          setConfirmOpen(false);
          doSubmit(true);
        }}
      />
    </Sheet>
  );
}
