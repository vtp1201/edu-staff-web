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
import { SDSegmentedField, type SDSegmentedOption } from "./sd-segmented-field";
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

/** Checked tint per severity — mirrors `SDSeverityBadge`'s tone mapping
 *  (MINOR→warning, MODERATE→error, SEVERE→error-dark) with the same AA-safe
 *  token pairs used by `StatusBadge`. Literal strings: Tailwind v4 cannot scan a
 *  computed class. No new token. */
const SEVERITY_CHECKED_CLASS: Record<StaffViolationSeverity, string> = {
  MINOR:
    "data-[state=checked]:bg-edu-warning/15 data-[state=checked]:text-edu-warning-foreground",
  MODERATE:
    "data-[state=checked]:bg-edu-error/15 data-[state=checked]:text-edu-error-text",
  SEVERE:
    "data-[state=checked]:bg-edu-error-dark-light data-[state=checked]:text-edu-error-dark",
};

export interface CreateViolationDialogProps {
  open: boolean;
  staffRoster: StaffRosterEntry[];
  /** Static `SD_CATEGORIES` picklist — DATA, never fetched (AC-002.2). */
  violationCategories: string[];
  isSubmitting: boolean;
  submitError?: StaffDisciplineSubmitError;
  onSubmit: (input: CreateStaffViolationInput) => void;
  onClose: () => void;
}

export function CreateViolationDialog({
  open,
  staffRoster,
  violationCategories,
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
  const descriptionId = useId();
  const descriptionErrorId = useId();

  const severityOptions: SDSegmentedOption<StaffViolationSeverity>[] =
    STAFF_VIOLATION_SEVERITIES.map((s) => ({
      value: s,
      label: tSeverity(SEVERITY_LABEL_KEY[s]),
      checkedClassName: SEVERITY_CHECKED_CLASS[s],
    }));

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
            {/* Design-spec `createForm.fields[2]`: a select over SD_CATEGORIES,
                a STATIC picklist prop — like the staff field above, it fires no
                network request ever (AC-002.2). */}
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id={categoryId} className="min-h-11">
                <SelectValue placeholder={tForm("categoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent className="pointer-events-auto">
                {violationCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <SDSegmentedField
            label={tForm("severity")}
            value={severity}
            options={severityOptions}
            errorMessage={
              showSeverityError ? fieldErrorMessage("severity") : undefined
            }
            onChange={setSeverity}
          />

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
              <Loader2
                className="size-4 motion-safe:animate-spin"
                aria-hidden="true"
              />
            )}
            {isSubmitting ? t("saving") : tCommon("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
