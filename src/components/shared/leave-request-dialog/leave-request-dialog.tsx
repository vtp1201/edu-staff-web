"use client";

import { AlertTriangle, Info, Paperclip, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type RefObject, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDialogReturnFocus } from "@/shared/use-dialog-return-focus";
import { cn } from "@/shared/utils";
import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  type AttachmentRejectionReason,
  MAX_ATTACHMENTS,
  validateLeaveAttachments,
} from "./validate-leave-attachments";

/** core `CreateStudentLeaveRequestRequest.reason` — `maxLength: 500`. */
const MAX_REASON = 500;

const ACCEPT = ALLOWED_ATTACHMENT_EXTENSIONS.map((e) => `.${e}`).join(",");

export interface LeaveRequestSubmission {
  startDate: string;
  endDate: string;
  reason: string;
  files: File[];
}

export interface LeaveRequestDialogProps {
  /** Controlled visibility — the host owns open/close. */
  open: boolean;
  /** Secondary line under the title, e.g. "Nguyễn Minh Khoa · Lớp 11A2". */
  description?: string;
  /**
   * Earliest selectable day, ISO `YYYY-MM-DD`. The host passes TODAY: core
   * refuses a back-dated request and the use-case refuses it before the wire,
   * so the picker should not offer it either.
   */
  minDate: string;
  isPending?: boolean;
  /** Already-translated server-failure copy, shown as an inline `role="alert"`. */
  errorMessage?: string | null;
  /** Focus target on close when the invoking control no longer exists. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  onSubmit: (submission: LeaveRequestSubmission) => void;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Xin phép nghỉ học" — the canonical leave-request dialog (US-E24.6,
 * design `APExcuseRequestDialog`).
 *
 * A **Dialog**, not a Sheet (design-spec `parent-attendance.excuseDialog`,
 * EPIC-OVERVIEW D6). Its field set is D6-normative and matches core's
 * `CreateStudentLeaveRequestRequest` exactly: date pair + reason (+ optional
 * evidence). There is deliberately NO "Theo tiết"/leave-type control — core has
 * neither concept, and the two legacy forms that DO have a `type` field are
 * mock-only (consolidating them here is a logged follow-up).
 *
 * It does NOT know who the request is for. `studentMemberId`/`classId` are
 * resolved server-side by the host's Server Action — a dialog that collected an
 * identity would be a dialog a caller could lie to.
 *
 * a11y: Radix supplies the focus trap, Escape, and focus return (asserted in
 * the stories, not re-implemented); every field has a linked `<label>`; the
 * disabled submit explains itself through `aria-describedby` on the reason
 * field; rejected files are listed as TEXT, never colour alone.
 */
export function LeaveRequestDialog({
  open,
  description,
  minDate,
  isPending = false,
  errorMessage,
  returnFocusRef,
  onSubmit,
  onOpenChange,
}: LeaveRequestDialogProps) {
  const t = useTranslations("discipline.studentConduct.leaveRequest");
  const tAttach = useTranslations(
    "discipline.studentConduct.leaveRequest.attachments",
  );
  const startId = useId();
  const endId = useId();
  const reasonId = useId();
  const counterId = useId();
  const reasonErrorId = useId();
  const fileId = useId();
  const rejectedId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const returnFocus = useDialogReturnFocus(open, returnFocusRef);

  const [startDate, setStartDate] = useState(minDate);
  const [endDate, setEndDate] = useState(minDate);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [rejected, setRejected] = useState<
    { name: string; reason: AttachmentRejectionReason }[]
  >([]);

  // Reset on close so re-opening never inherits the previous draft.
  useEffect(() => {
    if (!open) {
      setStartDate(minDate);
      setEndDate(minDate);
      setReason("");
      setTouched(false);
      setFiles([]);
      setRejected([]);
    }
  }, [open, minDate]);

  const trimmed = reason.trim();
  const reasonEmpty = trimmed.length === 0;
  const reasonTooLong = trimmed.length > MAX_REASON;
  const reasonInvalid = reasonEmpty || reasonTooLong;
  // The empty-reason hint is ALWAYS described (not only after a blur): the
  // submit button starts disabled, so the reason for that must be readable
  // before the user has touched anything.
  const reasonMessage = reasonTooLong
    ? t("reasonTooLong", { max: MAX_REASON })
    : t("reasonRequired");

  function pickFiles(picked: FileList | null) {
    if (!picked) return;
    const result = validateLeaveAttachments(Array.from(picked), files.length);
    setFiles((current) => [...current, ...result.valid]);
    setRejected(
      result.rejected.map((r) => ({ name: r.file.name, reason: r.reason })),
    );
    // Let the same file be re-picked after a removal.
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] overflow-y-auto [&>*]:min-w-0"
        onCloseAutoFocus={returnFocus}
      >
        <DialogHeader>
          <DialogTitle className="font-extrabold text-base text-foreground">
            {t("title")}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-edu-text-secondary text-sm">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={startId}>{t("startDate")}</Label>
            <Input
              id={startId}
              type="date"
              value={startDate}
              min={minDate}
              disabled={isPending}
              onChange={(e) => {
                setStartDate(e.target.value);
                // Keep the range valid: moving the start past the end drags
                // the end with it rather than submitting an inverted range.
                if (e.target.value > endDate) setEndDate(e.target.value);
              }}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={endId}>{t("endDate")}</Label>
            <Input
              id={endId}
              type="date"
              value={endDate}
              min={startDate}
              disabled={isPending}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={reasonId}>{t("reason")}</Label>
          <Textarea
            id={reasonId}
            rows={3}
            value={reason}
            maxLength={MAX_REASON}
            placeholder={t("reasonPlaceholder")}
            aria-required="true"
            aria-invalid={touched && reasonInvalid}
            aria-describedby={`${counterId} ${reasonInvalid ? reasonErrorId : ""}`.trim()}
            disabled={isPending}
            onChange={(e) => {
              setReason(e.target.value);
              setTouched(true);
            }}
          />
          <span id={counterId} className="text-muted-foreground text-xs">
            {t("reasonCounter", { count: trimmed.length, max: MAX_REASON })}
          </span>
          {reasonInvalid ? (
            <p
              id={reasonErrorId}
              className={cn(
                "flex items-start gap-1.5 text-xs",
                touched ? "text-edu-error-text" : "text-edu-text-secondary",
              )}
            >
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0"
              />
              {reasonMessage}
            </p>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={fileId}>{tAttach("label")}</Label>
          <Input
            ref={fileInputRef}
            id={fileId}
            type="file"
            multiple
            accept={ACCEPT}
            disabled={isPending || files.length >= MAX_ATTACHMENTS}
            aria-describedby={rejected.length > 0 ? rejectedId : undefined}
            onChange={(e) => pickFiles(e.target.files)}
          />
          <span className="text-muted-foreground text-xs">
            {tAttach("hint")}
          </span>

          {files.length > 0 ? (
            <ul className="mt-1 flex flex-col gap-1">
              {files.map((file) => (
                <li
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  className="flex items-center gap-2 rounded-[var(--edu-radius-btn)] bg-muted px-2.5 py-1.5 text-xs"
                >
                  <Paperclip
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-edu-text-secondary"
                  />
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    aria-label={tAttach("remove", { fileName: file.name })}
                    disabled={isPending}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-edu-text-secondary hover:bg-background focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                    onClick={() =>
                      setFiles((current) => current.filter((f) => f !== file))
                    }
                  >
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {/* Rejections are TEXT (icon + sentence), never a red border alone. */}
          {rejected.length > 0 ? (
            <div
              id={rejectedId}
              role="alert"
              className="mt-1 flex flex-col gap-1"
            >
              <p className="font-semibold text-edu-error-text text-xs">
                {tAttach("rejectedTitle")}
              </p>
              <ul className="flex flex-col gap-0.5">
                {rejected.map((r) => (
                  <li
                    key={`${r.name}-${r.reason}`}
                    className="text-edu-error-text text-xs"
                  >
                    {r.reason === "ext"
                      ? tAttach("errorExt", { fileName: r.name })
                      : r.reason === "size"
                        ? tAttach("errorSize", { fileName: r.name })
                        : tAttach("errorCount", { fileName: r.name })}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <p className="flex items-start gap-2 rounded-[var(--edu-radius-btn)] bg-edu-warning-light px-3 py-2.5 text-edu-warning-text text-xs leading-relaxed">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {t("notice")}
        </p>

        {errorMessage ? (
          <p
            role="alert"
            className="flex items-start gap-1.5 text-edu-error-text text-xs"
          >
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 size-3.5 shrink-0"
            />
            {errorMessage}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            disabled={reasonInvalid || isPending || endDate < startDate}
            aria-busy={isPending}
            onClick={() =>
              onSubmit({ startDate, endDate, reason: trimmed, files })
            }
          >
            <Send aria-hidden="true" className="size-4" />
            {isPending ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
