"use client";

import { Calendar, Check, CheckCircle2, Clock, X, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { StaffLeaveRequestEntity } from "@/features/staff-leave/domain/entities/staff-leave-request.entity";
import { cn } from "@/shared/utils";
import {
  LEAVE_TYPE_META,
  ROLE_TONE,
  STATUS_ACCENT,
  STATUS_REASON_BORDER,
  STATUS_TONE,
} from "./staff-leave-tones";

const REASON_TRUNCATE = 130;
const MIN_REJECT_LENGTH = 10;

const STATUS_ICON = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
} as const;

export interface StaffLeaveRequestCardProps {
  request: StaffLeaveRequestEntity;
  isRejecting: boolean;
  rejectReason: string;
  isBusy: boolean;
  onApprove: () => void;
  onStartReject: () => void;
  onChangeRejectReason: (value: string) => void;
  onConfirmReject: () => void;
  onCancelReject: () => void;
}

export function StaffLeaveRequestCard({
  request,
  isRejecting,
  rejectReason,
  isBusy,
  onApprove,
  onStartReject,
  onChangeRejectReason,
  onConfirmReject,
  onCancelReject,
}: StaffLeaveRequestCardProps) {
  const t = useTranslations("staffLeave");
  const tCard = useTranslations("staffLeave.card");
  const tActions = useTranslations("staffLeave.actions");
  const tDialog = useTranslations("staffLeave.rejectDialog");
  const [expanded, setExpanded] = useState(false);
  const reasonHintId = useId();
  const reasonBodyId = useId();
  const rejectFieldId = useId();
  const rejectFieldRef = useRef<HTMLTextAreaElement>(null);
  const rejectTriggerRef = useRef<HTMLButtonElement>(null);
  const didRejectRef = useRef(false);

  // Move focus to the reason field when the editor opens (AC-9 focus mgmt).
  useEffect(() => {
    if (isRejecting) rejectFieldRef.current?.focus();
  }, [isRejecting]);

  // Return focus to the reject trigger when the inline panel closes (WCAG 2.4.3).
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

  const { status } = request;
  const statusTone = STATUS_TONE[status];
  const StatusIcon = STATUS_ICON[status];
  const leaveMeta = LEAVE_TYPE_META[request.leaveType];
  const LeaveIcon = leaveMeta.icon;

  const isLong = request.reason.length > REASON_TRUNCATE;
  const reasonText =
    expanded || !isLong
      ? request.reason
      : `${request.reason.slice(0, REASON_TRUNCATE).trimEnd()}…`;

  const trimmedReason = rejectReason.trim();
  const rejectValid = trimmedReason.length >= MIN_REJECT_LENGTH;
  const dateRange =
    request.endDate !== request.startDate
      ? `${request.startDate} — ${request.endDate}`
      : request.startDate;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[var(--edu-radius-card)] border bg-card shadow-card",
        status === "pending" ? "border-edu-warning/30" : "border-border",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-1", STATUS_ACCENT[status])}
      />

      <div className="flex flex-col gap-4 py-5 pr-5 pl-6 sm:flex-row sm:items-start">
        {/* Avatar */}
        <span
          aria-hidden="true"
          className="grid size-[42px] shrink-0 place-items-center rounded-full text-sm font-extrabold"
          style={{
            backgroundColor: `color-mix(in oklab, ${request.avatarTone} 15%, transparent)`,
            color: request.avatarTone,
          }}
        >
          {request.initials}
        </span>

        <div className="min-w-0 flex-1">
          {/* Header line */}
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-extrabold text-foreground">
              {request.staffName}
            </h3>
            <StatusBadge tone={ROLE_TONE[request.staffRole]}>
              {t(`staffRole.${request.staffRole}`)}
            </StatusBadge>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-edu-text-secondary">
              <LeaveIcon
                className={cn("size-3.5", leaveMeta.iconClass)}
                aria-hidden="true"
              />
              {t(`leaveType.${request.leaveType}`)}
            </span>
            <span className="text-xs text-muted-foreground">
              · {request.department}
            </span>
          </div>

          {/* Date range chip */}
          <div className="mb-2.5 inline-flex items-center gap-2 rounded-[var(--edu-radius-btn)] border border-border bg-muted px-2.5 py-1 text-xs font-bold text-edu-text-secondary">
            <Calendar className="size-3.5" aria-hidden="true" />
            <span className="font-mono">{dateRange}</span>
            <span className="text-edu-text-secondary">·</span>
            <span className="font-extrabold text-foreground">
              {tCard("days", { count: request.days })}
            </span>
          </div>

          {/* Reason */}
          <div
            id={reasonBodyId}
            className={cn(
              "rounded-lg border-l-[3px] bg-muted px-3 py-2.5 text-sm leading-relaxed text-foreground",
              STATUS_REASON_BORDER[status],
            )}
          >
            <span className="mr-2 align-middle text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
              {tCard("reason")}
            </span>
            {reasonText}
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                aria-expanded={expanded}
                aria-controls={reasonBodyId}
                className="ml-1.5 font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {expanded ? tCard("showLess") : tCard("showMore")}
              </button>
            )}
          </div>

          {/* Approved footnote */}
          {status === "approved" && request.approvedBy && (
            <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-edu-success-text">
              <Check className="size-3.5" aria-hidden="true" />
              {tCard("approvedBy")}{" "}
              <strong className="font-extrabold text-foreground">
                {request.approvedBy}
              </strong>
              {request.approvedAt && (
                <span className="ml-1 font-mono text-muted-foreground">
                  · {request.approvedAt}
                </span>
              )}
            </p>
          )}

          {/* Rejected footnote + reason */}
          {status === "rejected" && request.rejectedBy && (
            <>
              <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-edu-error-text">
                <X className="size-3.5" aria-hidden="true" />
                {tCard("rejectedBy")}{" "}
                <strong className="font-extrabold text-foreground">
                  {request.rejectedBy}
                </strong>
                {request.rejectedAt && (
                  <span className="ml-1 font-mono text-muted-foreground">
                    · {request.rejectedAt}
                  </span>
                )}
              </p>
              {request.rejectionReason && (
                <div className="mt-1.5 rounded-[var(--edu-radius-btn)] border border-edu-error/20 bg-edu-error/10 px-3 py-2 text-xs leading-relaxed text-edu-text-secondary">
                  <strong className="font-extrabold text-edu-error-text">
                    {tCard("rejectionReason")}
                  </strong>{" "}
                  {request.rejectionReason}
                </div>
              )}
            </>
          )}

          {/* Inline rejection editor */}
          {isRejecting && (
            <div className="mt-3 rounded-lg border border-edu-error/20 bg-edu-error/10 p-3.5">
              <label
                htmlFor={rejectFieldId}
                className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-edu-error-text"
              >
                {tDialog("title")} <span aria-hidden="true">*</span>
              </label>
              <Textarea
                ref={rejectFieldRef}
                id={rejectFieldId}
                value={rejectReason}
                onChange={(e) => onChangeRejectReason(e.target.value)}
                rows={3}
                aria-required="true"
                aria-invalid={!rejectValid}
                aria-describedby={reasonHintId}
                placeholder={tDialog("placeholder")}
                className="resize-y bg-card"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  id={reasonHintId}
                  className={cn(
                    "flex-1 text-xs",
                    rejectValid
                      ? "text-edu-success-text"
                      : "text-edu-text-secondary",
                  )}
                >
                  {rejectValid ? tDialog("ready") : tDialog("minLength")}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancelReject}
                  disabled={isBusy}
                >
                  {tActions("cancel")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onConfirmReject}
                  disabled={!rejectValid || isBusy}
                >
                  <X className="size-4" aria-hidden="true" />
                  {isBusy ? tActions("rejecting") : tActions("confirmReject")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right column — status + actions */}
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <StatusBadge tone={statusTone}>
            <StatusIcon className="size-3" aria-hidden="true" />
            {t(`status.${status}`)}
          </StatusBadge>
          <span className="text-[11px] text-edu-text-secondary sm:text-right">
            {tCard("submittedAt", { at: request.submittedAt })}
          </span>

          {status === "pending" && !isRejecting && (
            <div className="flex gap-2">
              <Button
                ref={rejectTriggerRef}
                type="button"
                variant="outline"
                onClick={onStartReject}
                disabled={isBusy}
                aria-label={`${tActions("reject")} — ${request.staffName}`}
                className="border-edu-error/40 bg-edu-error/10 text-edu-error-text hover:bg-edu-error/15"
              >
                <X className="size-4" aria-hidden="true" />
                {tActions("reject")}
              </Button>
              <Button
                type="button"
                onClick={onApprove}
                disabled={isBusy}
                aria-label={`${tActions("approve")} — ${request.staffName}`}
                className="bg-edu-success text-edu-warning-foreground hover:bg-edu-success/90"
              >
                <Check className="size-4" aria-hidden="true" />
                {isBusy ? tActions("approving") : tActions("approve")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
