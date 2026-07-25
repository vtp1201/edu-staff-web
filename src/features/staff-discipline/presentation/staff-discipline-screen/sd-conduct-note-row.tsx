"use client";

import { Check, Lock, PenLine, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { StaffConductNoteEntity } from "../../domain/entities/staff-conduct-note.entity";
import type { StaffRosterEntry } from "../../domain/entities/staff-roster.entity";
import { SDRatingBadge } from "./sd-rating-badge";
import { SDRejectPanel } from "./sd-reject-panel";
import { SDSelfApprovedNote } from "./sd-self-approved-note";
import { SDStateBadge } from "./sd-state-badge";
import type { StaffDisciplineErrorKey } from "./staff-discipline-screen.i-vm";

/**
 * One conduct-note row.
 *
 * **AC-007.4 is enforced HERE, structurally**: when `isLocked` (state===APPROVED)
 * the row renders a static, non-interactive lock message (icon + text, NOT a
 * disabled button — a disabled button still announces as a control) and NO edit
 * trigger exists at all. `onOpenSetDialog` is therefore unreachable for an
 * APPROVED note, and `SetConductNoteDialog` has no "open but locked" prop
 * variant — so "the form must not even open" is a structural guarantee rather
 * than a runtime `if` inside the dialog.
 */
export interface SDConductNoteRowProps {
  note: StaffConductNoteEntity;
  staff: StaffRosterEntry;
  canSubmit: boolean;
  canDecide: boolean;
  canEdit: boolean;
  /** `note.state === "APPROVED"` — computed by the container, not re-derived. */
  isLocked: boolean;
  isRejecting: boolean;
  isBusy: boolean;
  rejectReason: string;
  errorMessage?: string;
  rejectServerErrorKey?: StaffDisciplineErrorKey;
  onSubmit: () => void;
  onApprove: () => void;
  onStartReject: () => void;
  onChangeRejectReason: (value: string) => void;
  onConfirmReject: () => void;
  onCancelReject: () => void;
  onOpenSetDialog: () => void;
}

export function SDConductNoteRow({
  note,
  staff,
  canSubmit,
  canDecide,
  canEdit,
  isLocked,
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
  onOpenSetDialog,
}: SDConductNoteRowProps) {
  const t = useTranslations("staffDiscipline.conductNotes");
  const tActions = useTranslations("staffDiscipline.conductNotes.actions");
  const tErrors = useTranslations("staffDiscipline.errors");
  const rejectTriggerRef = useRef<HTMLButtonElement>(null);
  const didRejectRef = useRef(false);

  // A11Y-002: focus returns to the reject trigger when the inline panel closes
  // (WCAG 2.4.3), mirroring `SDViolationRow`/`StaffLeaveRequestCard`.
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
        className="grid size-10 shrink-0 place-items-center rounded-full bg-edu-purple/15 font-extrabold text-edu-text-primary text-xs"
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
          <SDRatingBadge rating={note.rating} />
        </div>

        <p className="mb-1 font-bold text-edu-text-secondary text-xs">
          {t("columns.term")}: <span className="font-mono">{note.termId}</span>
        </p>
        <p className="text-foreground text-sm leading-relaxed">{note.note}</p>

        {note.state === "REJECTED" && note.rejectionReason && (
          <div className="mt-2 rounded-[var(--edu-radius-btn)] border border-edu-error/20 bg-edu-error/10 px-3 py-2 text-edu-text-secondary text-xs leading-relaxed">
            <strong className="font-extrabold text-edu-error-text">
              {tActions("reject")}:
            </strong>{" "}
            {note.rejectionReason}
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
        <SDStateBadge state={note.state} />
        {note.selfApproved && <SDSelfApprovedNote />}

        {isLocked ? (
          // Static, non-focusable lock notice — the ONLY thing rendered where an
          // edit trigger would otherwise be (AC-007.4 / NFR-009).
          <p className="inline-flex items-center gap-1.5 font-semibold text-edu-text-secondary text-xs sm:text-right">
            <Lock className="size-3.5 shrink-0" aria-hidden="true" />
            {tErrors("locked")}
          </p>
        ) : (
          canEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenSetDialog}
              disabled={isBusy}
              aria-label={`${t("form.title")} — ${staff.staffName}`}
              className="min-h-11"
            >
              <PenLine className="size-4" aria-hidden="true" />
              {t("form.title")}
            </Button>
          )
        )}

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
