"use client";

import { Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/utils";
import type { StaffRosterEntry } from "../../domain/entities/staff-roster.entity";
import {
  type CreateStaffViolationInput,
  STAFF_VIOLATION_SEVERITIES,
  type StaffViolationSeverity,
} from "../../domain/entities/staff-violation.entity";
import {
  fieldErrorFor,
  useSDErrorMessage,
  useSDFieldErrorMessage,
} from "./sd-error-message";
import type { StaffDisciplineSubmitError } from "./staff-discipline-screen.i-vm";

/**
 * Create-violation dialog (principal only, constructive → plain `Dialog`).
 * The staff-member field is a STATIC select over the roster prop — there is no
 * search action anywhere in this feature, so AC-002.2's "no network request ever
 * fires for this field" holds structurally (FR-009/FR-013).
 *
 * The dialog NEVER closes on error (spec §5): field values are preserved for
 * retry (AC-002.7). It closes only when the container flips `open` after success.
 */
const SEVERITY_LABEL_KEY = {
  MINOR: "low",
  MODERATE: "medium",
  SEVERE: "high",
} as const;

export interface CreateViolationDialogProps {
  open: boolean;
  staffRoster: StaffRosterEntry[];
  isSubmitting: boolean;
  submitError?: StaffDisciplineSubmitError;
  onSubmit: (input: CreateStaffViolationInput) => void;
  onClose: () => void;
}

export function CreateViolationDialog({
  open,
  staffRoster,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: CreateViolationDialogProps) {
  const t = useTranslations("staffDiscipline.violations");
  const tForm = useTranslations("staffDiscipline.violations.form");
  const tSeverity = useTranslations("staffDiscipline.violations.severity");
  const tCommon = useTranslations("Common.confirmDialog");
  const errorMessage = useSDErrorMessage();
  const fieldErrorMessage = useSDFieldErrorMessage();

  const staffId = useId();
  const occurredAtId = useId();
  const categoryId = useId();
  const severityId = useId();
  const descriptionId = useId();
  const severityErrorId = useId();
  const descriptionErrorId = useId();

  const [staffMemberId, setStaffMemberId] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState<StaffViolationSeverity | "">("");
  const [description, setDescription] = useState("");

  // Fresh form on every open (AC-002.1).
  useEffect(() => {
    if (open) {
      setStaffMemberId("");
      setOccurredAt("");
      setCategory("");
      setSeverity("");
      setDescription("");
    }
  }, [open]);

  const severityFieldError = fieldErrorFor("severity", submitError?.fields);
  const descriptionFieldError = fieldErrorFor(
    "description",
    submitError?.fields,
  );
  const showSeverityError =
    Boolean(severityFieldError) || submitError?.errorKey === "invalid-severity";

  const canSubmit =
    staffMemberId !== "" &&
    severity !== "" &&
    category.trim() !== "" &&
    occurredAt !== "" &&
    description.trim() !== "" &&
    !isSubmitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Never auto-close while a submit is in flight (AC-002.6).
        if (!next && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="max-w-lg [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>{tForm("title")}</DialogTitle>
          <DialogDescription>{t("addNew")}</DialogDescription>
        </DialogHeader>

        {submitError && !severityFieldError && !descriptionFieldError && (
          <p
            role="alert"
            className="rounded-[var(--edu-radius-btn)] border border-edu-error/20 bg-edu-error/10 px-3 py-2 font-semibold text-edu-error-text text-xs"
          >
            {errorMessage(submitError.errorKey)}
          </p>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            {/* Native label + Select trigger button → the accessible name comes
                from the label, not the placeholder. */}
            <label
              htmlFor={staffId}
              className="font-bold text-foreground text-xs"
            >
              {tForm("staffMember")}
            </label>
            <Select value={staffMemberId} onValueChange={setStaffMemberId}>
              <SelectTrigger id={staffId} className="min-h-11">
                <SelectValue placeholder={tForm("staffMemberPlaceholder")} />
              </SelectTrigger>
              <SelectContent className="pointer-events-auto">
                {staffRoster.map((s) => (
                  <SelectItem key={s.staffMemberId} value={s.staffMemberId}>
                    {s.staffName} — {s.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={occurredAtId}
              className="font-bold text-foreground text-xs"
            >
              {tForm("occurredAt")}
            </label>
            <Input
              id={occurredAtId}
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="min-h-11"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={categoryId}
              className="font-bold text-foreground text-xs"
            >
              {tForm("category")}
            </label>
            <Input
              id={categoryId}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={tForm("categoryPlaceholder")}
              className="min-h-11"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={severityId}
              className="font-bold text-foreground text-xs"
            >
              {tForm("severity")}
            </label>
            <Select
              value={severity}
              onValueChange={(v) => setSeverity(v as StaffViolationSeverity)}
            >
              <SelectTrigger
                id={severityId}
                aria-invalid={showSeverityError}
                aria-describedby={
                  showSeverityError ? severityErrorId : undefined
                }
                className="min-h-11"
              >
                <SelectValue placeholder={tForm("severity")} />
              </SelectTrigger>
              <SelectContent className="pointer-events-auto">
                {STAFF_VIOLATION_SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {tSeverity(SEVERITY_LABEL_KEY[s])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showSeverityError && (
              <p
                id={severityErrorId}
                className="font-semibold text-edu-error-text text-xs"
              >
                {fieldErrorMessage("severity")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={descriptionId}
              className="font-bold text-foreground text-xs"
            >
              {tForm("description")}
            </label>
            <Textarea
              id={descriptionId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              aria-invalid={Boolean(descriptionFieldError)}
              aria-describedby={
                descriptionFieldError ? descriptionErrorId : undefined
              }
              placeholder={tForm("descriptionPlaceholder")}
              className={cn(
                "resize-y",
                descriptionFieldError && "border-edu-error",
              )}
            />
            {descriptionFieldError && (
              <p
                id={descriptionErrorId}
                className="font-semibold text-edu-error-text text-xs"
              >
                {fieldErrorMessage("description")}
              </p>
            )}
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
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            aria-busy={isSubmitting}
            onClick={() =>
              onSubmit({
                staffMemberId,
                category: category.trim(),
                description: description.trim(),
                severity: severity as StaffViolationSeverity,
                occurredAt,
              })
            }
            className="min-h-11"
          >
            {isSubmitting && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            {isSubmitting ? t("saving") : tCommon("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
