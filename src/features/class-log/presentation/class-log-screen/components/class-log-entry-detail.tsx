"use client";

import { Check, ChevronLeft, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { HomeroomEntry } from "../../../domain/entities/homeroom-entry.entity";
import { STATUS_TONE } from "../status-tone";

type Props = {
  entry: HomeroomEntry;
  isPrincipal: boolean;
  isPending: boolean;
  onBack: () => void;
  onSubmit: (entry: HomeroomEntry) => void;
  onApprove: (entry: HomeroomEntry) => void;
  onReject: (entry: HomeroomEntry, reason: string) => void;
};

export function ClassLogEntryDetail({
  entry,
  isPrincipal,
  isPending,
  onBack,
  onSubmit,
  onApprove,
  onReject,
}: Props) {
  const t = useTranslations("classLog");
  const reasonId = useId();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const canTeacherSubmit =
    !isPrincipal && (entry.status === "DRAFT" || entry.status === "REJECTED");
  const canPrincipalReview = isPrincipal && entry.status === "SUBMITTED";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        autoFocus
        className="self-start text-edu-text-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={onBack}
      >
        <ChevronLeft className="size-3.5" aria-hidden="true" />
        {t("detail.back")}
      </Button>

      <article className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 bg-primary px-7 py-5 text-primary-foreground">
          <div className="min-w-0">
            <div className="font-extrabold text-lg leading-snug">
              {entry.summary}
            </div>
            <div className="mt-1 text-xs">{entry.entryDate}</div>
          </div>
          <StatusBadge tone={STATUS_TONE[entry.status]} className="shrink-0">
            {t(`status.${entry.status}`)}
          </StatusBadge>
        </header>

        <div className="flex flex-col gap-5 p-7">
          {entry.notableEvents && (
            <div>
              <div className="mb-1.5 font-bold text-edu-text-secondary text-xs uppercase tracking-wide">
                {t("form.notableEvents")}
              </div>
              <div className="rounded-[var(--edu-radius-btn)] border border-border bg-muted/40 px-4 py-3 text-edu-text-secondary text-sm leading-relaxed">
                {entry.notableEvents}
              </div>
            </div>
          )}

          {/* Teacher signature row */}
          <div className="flex justify-end border-border border-t pt-4">
            <div className="text-center">
              <div className="text-edu-text-secondary text-xs">
                {t("detail.teacherSignature")}
              </div>
              <div className="mt-1 font-bold text-edu-primary-accessible text-sm italic">
                {entry.authorMemberId}
              </div>
            </div>
          </div>

          {/* Approved/rejected outcome banner */}
          {entry.status === "APPROVED" && (
            <div className="rounded-[var(--edu-radius-card)] border border-edu-success/30 bg-edu-success/8 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="success">
                  <Check className="size-3" aria-hidden="true" />
                  {t("detail.approvedLabel")}
                </StatusBadge>
                <span className="text-edu-text-secondary text-xs">
                  {t("detail.approvedBy")}
                </span>
              </div>
            </div>
          )}
          {entry.status === "REJECTED" && (
            <div className="rounded-[var(--edu-radius-card)] border border-edu-error/30 bg-edu-error/8 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="error">
                  <X className="size-3" aria-hidden="true" />
                  {t("detail.rejectedLabel")}
                </StatusBadge>
                <span className="text-edu-text-secondary text-xs">
                  {t("detail.approvedBy")}
                </span>
              </div>
              {entry.reason && (
                <p className="mt-2 text-edu-error-text text-xs leading-relaxed">
                  <span className="font-bold">
                    {t("detail.rejectionReason")}
                  </span>{" "}
                  {entry.reason}
                </p>
              )}
            </div>
          )}

          {/* Teacher submit action */}
          {canTeacherSubmit && (
            <div className="flex justify-end border-border border-t pt-4">
              <Button
                type="button"
                disabled={isPending}
                onClick={() => onSubmit(entry)}
              >
                {isPending ? t("form.submitting") : t("form.submit")}
              </Button>
            </div>
          )}

          {/* Principal review */}
          {canPrincipalReview && (
            <div className="rounded-[var(--edu-radius-card)] border border-edu-success/30 bg-edu-success/8 p-4">
              <div className="mb-3 font-bold text-edu-success-text text-sm">
                {t("detail.bghReview")}
              </div>

              {rejecting ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={reasonId} className="text-edu-text-secondary">
                    {t("detail.rejectReason")}
                  </Label>
                  <Textarea
                    id={reasonId}
                    rows={2}
                    aria-label={t("detail.rejectReason")}
                    placeholder={t("detail.rejectReasonPlaceholder")}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRejecting(false);
                        setReason("");
                      }}
                    >
                      {t("detail.cancelReject")}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={isPending}
                      onClick={() => onReject(entry, reason)}
                    >
                      <X className="size-3.5" aria-hidden="true" />
                      {t("detail.confirmReject")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    className="bg-edu-success text-edu-warning-foreground hover:bg-edu-success/90 hover:text-edu-warning-foreground"
                    disabled={isPending}
                    onClick={() => onApprove(entry)}
                  >
                    <Check className="size-3.5" aria-hidden="true" />
                    {isPending ? t("detail.approving") : t("detail.approve")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-edu-error text-edu-error-text"
                    onClick={() => setRejecting(true)}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    {t("detail.reject")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
