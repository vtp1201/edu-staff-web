"use client";

import { Check, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { StaffRosterEntry } from "../../domain/entities/staff-roster.entity";
import type { StaffViolationEntity } from "../../domain/entities/staff-violation.entity";
import { SDRejectPanel } from "./sd-reject-panel";
import { SDSelfApprovedNote } from "./sd-self-approved-note";
import { SDSeverityBadge } from "./sd-severity-badge";
import { SDStateBadge } from "./sd-state-badge";
import type { StaffDisciplineErrorKey } from "./staff-discipline-screen.i-vm";

/**
 * One violation row. Purely presentational: action visibility is CALLER-computed
 * (`canSubmit`/`canDecide` — role + ownership + state) and never re-derived here,
 * so a `teacher` row renders ZERO mutating controls in the DOM (AC-001.3), not
 * disabled ones.
 */
export interface SDViolationRowProps {
  violation: StaffViolationEntity;
  staff: StaffRosterEntry;
  canSubmit: boolean;
  canDecide: boolean;
  isRejecting: boolean;
  isBusy: boolean;
  rejectReason: string;
  /** Already-translated inline row error (row-level failure backstop). */
  errorMessage?: string;
  rejectServerErrorKey?: StaffDisciplineErrorKey;
  onSubmit: () => void;
  onApprove: () => void;
  onStartReject: () => void;
  onChangeRejectReason: (value: string) => void;
  onConfirmReject: () => void;
  onCancelReject: () => void;
}

export function SDViolationRow({
  violation,
  staff,
  canSubmit,
  canDecide,
  isRejecting,
  isBusy,
  rejectReason,
  errorMessage,
  rejectServerErrorKey,
  onSubmit,
  onApprove,
  onStartReject,
  onChangeRejectReason,
  onConfirmReject,
  onCancelReject,
}: SDViolationRowProps) {
  const t = useTranslations("staffDiscipline.violations");
  const tActions = useTranslations("staffDiscipline.violations.actions");
  const rejectTriggerRef = useRef<HTMLButtonElement>(null);
  const didRejectRef = useRef(false);

  // A11Y-002: return focus to the trigger when the inline panel closes (WCAG
  // 2.4.3) — same shape as `StaffLeaveRequestCard`. On a SUCCESSFUL reject the
  // trigger is gone (the row is no longer decidable), so the optional call is a
  // no-op by design.
  useEffect(() => {
    if (isRejecting) {
      didRejectRef.current = true;
      return;
    }
    if (didRejectRef.current) {
      rejectTriggerRef.current?.focus();
      didRejectRef.current = false;
    }
  }, [isRejecting]);

  return (
    <article className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 font-extrabold text-primary text-xs"
      >
        {staff.initials}
      </span>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="font-extrabold text-[15px] text-foreground">
            {staff.staffName}
          </h3>
          {staff.department && (
            <span className="text-muted-foreground text-xs">
              · {staff.department}
            </span>
          )}
          <SDSeverityBadge severity={violation.severity} />
        </div>

        <p className="mb-1 font-bold text-edu-text-secondary text-xs">
          {violation.category}
          <span className="ml-2 font-mono font-normal">
            {violation.occurredAt}
          </span>
        </p>
        <p className="text-foreground text-sm leading-relaxed">
          {violation.description}
        </p>

        {violation.state === "REJECTED" && violation.rejectionReason && (
          <div className="mt-2 rounded-[var(--edu-radius-btn)] border border-edu-error/20 bg-edu-error/10 px-3 py-2 text-edu-text-secondary text-xs leading-relaxed">
            <strong className="font-extrabold text-edu-error-text">
              {t("actions.reject")}:
            </strong>{" "}
            {violation.rejectionReason}
          </div>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="mt-2 font-semibold text-edu-error-text text-xs"
          >
            {errorMessage}
          </p>
        )}

        {isRejecting && (
          <SDRejectPanel
            reason={rejectReason}
            onChangeReason={onChangeRejectReason}
            isBusy={isBusy}
            busyLabel={tActions("rejecting")}
            serverErrorKey={
              rejectServerErrorKey === "missing-reject-reason"
                ? "missing-reject-reason"
                : undefined
            }
            onConfirm={onConfirmReject}
            onCancel={onCancelReject}
          />
        )}
      </div>

      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <SDStateBadge state={violation.state} />
        {/* ADR 0073 — mounted whenever the record is self-approved; the note
            itself has no way to hide (see sd-self-approved-note.tsx). */}
        {violation.selfApproved && <SDSelfApprovedNote />}

        {canSubmit && (
          <Button
            type="button"
            variant="outline"
            onClick={onSubmit}
            disabled={isBusy}
            aria-busy={isBusy}
            aria-label={`${tActions("submit")} — ${staff.staffName}`}
            className="min-h-11"
          >
            <Send className="size-4" aria-hidden="true" />
            {isBusy ? tActions("submitting") : tActions("submit")}
          </Button>
        )}

        {canDecide && !isRejecting && (
          <div className="flex gap-2">
            <Button
              ref={rejectTriggerRef}
              type="button"
              variant="outline"
              onClick={onStartReject}
              disabled={isBusy}
              aria-label={`${tActions("reject")} — ${staff.staffName}`}
              className="min-h-11 border-edu-error/40 bg-edu-error/10 text-edu-error-text hover:bg-edu-error/15"
            >
              <X className="size-4" aria-hidden="true" />
              {tActions("reject")}
            </Button>
            <Button
              type="button"
              onClick={onApprove}
              disabled={isBusy}
              aria-busy={isBusy}
              aria-label={`${tActions("approve")} — ${staff.staffName}`}
              className="min-h-11 bg-edu-success text-edu-warning-foreground hover:bg-edu-success/90"
            >
              <Check className="size-4" aria-hidden="true" />
              {isBusy ? tActions("approving") : tActions("approve")}
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}
