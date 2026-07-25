"use client";

import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/utils";
import { STUDENT_ABSENCE_REASON_MAX_LENGTH } from "../../domain/entities/student-absence.entity";
import type { StudentRosterEntry } from "../../domain/entities/student-roster-entry.entity";
import { SADateField } from "./sa-date-field";
import { SAExcusedToggle } from "./sa-excused-toggle";
import { SAStaticField } from "./sa-static-field";
import type { StudentAbsencesErrorKey } from "./student-absences-screen.i-vm";

/**
 * ONE dialog for BOTH record and edit, discriminated on `mode`
 * (component-architecture.md §1 decision 2). The shared half — excused toggle +
 * reason textarea + footer + `aria-busy` + inline error banner — lives in exactly
 * one place; only the identity block differs between the two arms.
 *
 * The discriminated union is the point, not a style choice: the `mode: "edit"`
 * arm has NO `onDateChange`/`onStudentChange`/`roster` field AT ALL, so wiring an
 * editable control to a natural-key field is a COMPILE error, not a review catch
 * (AC-004.3, §1 decision 1). The edit arm renders `SAStaticField` ×3 — plain
 * text, never an input/select of any kind, not even disabled.
 *
 * The dialog never auto-closes while a submit is in flight and never closes on
 * error — field values survive for retry (spec §5, AC-003.8/AC-004.6).
 */

/**
 * Inline submit error. Deviation from component-architecture.md §4.2's literal
 * 4-value `kind` union, deliberately: spec §5 also requires `forbidden`
 * (AC-006.3) and `invalid-id` to surface inline here, and a closed subset would
 * have silently dropped them. Carrying the full failure key keeps the routing
 * total — `invalid-date` renders ON the date field, everything else in the
 * banner — while `message` stays already-translated (i18n at the container).
 */
export interface SAAbsenceFormSubmitError {
  errorKey: StudentAbsencesErrorKey;
  /** Already-i18n'd. */
  message: string;
}

interface SAAbsenceFormDialogBaseProps {
  open: boolean;
  isSubmitting: boolean;
  excused: boolean;
  onExcusedChange: (value: boolean) => void;
  reason: string;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  submitError?: SAAbsenceFormSubmitError;
}

export interface SARecordFormDialogProps extends SAAbsenceFormDialogBaseProps {
  mode: "record";
  /** Teacher's own class only (FR-010) — a STATIC prop, never a search result. */
  roster: StudentRosterEntry[];
  studentMemberId: string;
  onStudentChange: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  /** VM-seeded "today" bound; presentation never reads a clock. */
  today: string;
}

export interface SAEditFormDialogProps extends SAAbsenceFormDialogBaseProps {
  mode: "edit";
  // Natural key — STATIC DISPLAY TEXT ONLY. No setter for any of these three
  // exists anywhere in this type (§1 decision 1).
  dateDisplay: string;
  classDisplay: string;
  studentDisplay: string;
}

export type SAAbsenceFormDialogProps =
  | SARecordFormDialogProps
  | SAEditFormDialogProps;

export function SAAbsenceFormDialog(props: SAAbsenceFormDialogProps) {
  const t = useTranslations("studentAbsences");
  const tForm = useTranslations("studentAbsences.form");
  const tColumns = useTranslations("studentAbsences.columns");
  const tCommon = useTranslations("Common");
  const studentId = useId();
  const reasonId = useId();

  const {
    open,
    isSubmitting,
    excused,
    onExcusedChange,
    reason,
    onReasonChange,
    onSubmit,
    onClose,
    submitError,
  } = props;

  const isRecord = props.mode === "record";
  // `invalid-date` belongs ON the date field (AC-003.3/.4); every other failure
  // renders in the banner above the form.
  const dateError =
    isRecord && submitError?.errorKey === "invalid-date"
      ? submitError.message
      : undefined;
  const bannerError =
    submitError && submitError.errorKey !== "invalid-date"
      ? submitError.message
      : undefined;

  const canSubmit =
    !isSubmitting &&
    (props.mode === "edit" ||
      (props.studentMemberId.length > 0 && props.date.length > 0));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Never auto-close while a submit is in flight (spec §5).
        if (!next && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="max-w-lg [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>
            {isRecord ? tForm("recordTitle") : tForm("editTitle")}
          </DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        {bannerError && (
          <p
            role="alert"
            className="flex items-start gap-1.5 rounded-[var(--edu-radius-btn)] border border-edu-error/20 bg-edu-error/10 px-3 py-2 font-semibold text-edu-error-text text-xs"
          >
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            {bannerError}
          </p>
        )}

        <div className="flex flex-col gap-4">
          {props.mode === "record" ? (
            <>
              <div className="flex flex-col gap-1.5">
                {/* Native label + Select trigger → the accessible name comes
                    from the label, not the placeholder. */}
                <label
                  htmlFor={studentId}
                  className="font-bold text-foreground text-xs"
                >
                  {tColumns("student")}
                </label>
                <Select
                  value={props.studentMemberId}
                  onValueChange={props.onStudentChange}
                >
                  <SelectTrigger id={studentId} className="min-h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="pointer-events-auto">
                    {props.roster.map((s) => (
                      <SelectItem
                        key={s.studentMemberId}
                        value={s.studentMemberId}
                      >
                        {s.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <SADateField
                  label={tForm("date")}
                  value={props.date}
                  onChange={props.onDateChange}
                  max={props.today}
                  errorMessage={dateError}
                />
                <p className="text-edu-text-secondary text-xs">
                  {tForm("dateFutureHelper")}
                </p>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-3 rounded-[var(--edu-radius-btn)] bg-muted/50 p-3 sm:grid-cols-3">
              {/* Immutable identity — static text, never an editable control. */}
              <SAStaticField
                label={tColumns("date")}
                value={props.dateDisplay}
              />
              <SAStaticField
                label={t("filters.class")}
                value={props.classDisplay}
              />
              <SAStaticField
                label={tColumns("student")}
                value={props.studentDisplay}
              />
            </div>
          )}

          <SAExcusedToggle
            label={tForm("excused")}
            value={excused}
            onChange={onExcusedChange}
            labelExcused={t("excused")}
            labelUnexcused={t("unexcused")}
            disabled={isSubmitting}
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={reasonId}
              className="font-bold text-foreground text-xs"
            >
              {tForm("reason")}
            </label>
            <Textarea
              id={reasonId}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={3}
              maxLength={STUDENT_ABSENCE_REASON_MAX_LENGTH}
              placeholder={tForm("reasonPlaceholder")}
              className={cn("resize-y")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-11"
          >
            {tCommon("confirmDialog.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            aria-busy={isSubmitting}
            onClick={onSubmit}
            className="min-h-11"
          >
            {isSubmitting ? (
              <Loader2
                className="size-4 motion-safe:animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Check className="size-4" aria-hidden="true" />
            )}
            {isSubmitting
              ? tForm("saving")
              : isRecord
                ? tForm("submit")
                : tForm("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
