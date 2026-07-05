"use client";

import { AlertTriangle, Check, Clock, Lock } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { UnsealRequest } from "../../../domain/entities/seal-batch.entity";

export interface UnsealRequestCardProps {
  request: UnsealRequest;
  currentAdminId: string;
  readonly: boolean; // true for the "Resolved" section
  onConfirm: (requestId: string) => void;
  onRequestSelfApprove: (requestId: string) => void;
  isConfirming: boolean;
}

/** AC-8 — one pending/resolved unseal request row. */
export function UnsealRequestCard({
  request,
  currentAdminId,
  readonly,
  onConfirm,
  onRequestSelfApprove,
  isConfirming,
}: UnsealRequestCardProps) {
  const t = useTranslations("academicRecordSeal.unseal");
  const term = useTranslations("academicRecordSeal.selector");
  const format = useFormatter();

  const isPending = request.status === "PENDING";
  const isOwnRequest = request.requestedById === currentAdminId;
  const termLabel = term(request.term === "HK1" ? "term1" : "term2");

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-card shadow-card ${
        isPending ? "border-edu-warning/40" : "border-border"
      }`}
    >
      <div className="p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <Lock aria-hidden className="size-5 text-primary" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-extrabold text-base text-foreground">
                {request.studentName}
              </p>
              <span className="text-muted-foreground text-sm">
                {request.classId} · {termLabel} · {request.year}
              </span>
            </div>
            <p className="mt-2 rounded-lg border border-edu-warning/30 bg-edu-warning/10 p-3 text-muted-foreground text-sm">
              <span className="mr-1.5 font-bold text-edu-text-muted text-xs uppercase tracking-wide">
                {t("card.reasonLabel")}:
              </span>
              {request.reason}
            </p>
          </div>

          <div className="flex min-w-48 flex-col items-end gap-1.5">
            {isPending ? (
              <StatusBadge tone="warning">
                <Clock aria-hidden className="size-3" />
                {t("statusPending")}
              </StatusBadge>
            ) : (
              <StatusBadge tone="success">
                <Check aria-hidden className="size-3" />
                {request.selfApproved
                  ? t("statusApprovedSelf")
                  : t("statusApproved")}
              </StatusBadge>
            )}
            <p className="text-muted-foreground text-xs">
              {t("card.requestedBy", { name: request.requestedByName })}
            </p>
            <p className="text-muted-foreground text-xs tabular-nums">
              {format.dateTime(new Date(request.requestedAt), {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
            {request.status === "APPROVED" && request.coSignerName && (
              <p className="text-edu-success-text text-xs">
                {t("card.confirmedBy", { name: request.coSignerName })}
              </p>
            )}
          </div>
        </div>

        {!readonly && isPending && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-border border-t border-dashed pt-4">
            {isOwnRequest ? (
              <>
                <p className="flex flex-1 items-center gap-1.5 text-muted-foreground text-sm">
                  <Clock aria-hidden className="size-3.5" />
                  {t("card.awaitingOther")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="border-edu-error/50 text-edu-error-text"
                  onClick={() => onRequestSelfApprove(request.id)}
                >
                  <AlertTriangle aria-hidden className="size-4" />
                  {t("selfApproveButton")}
                </Button>
              </>
            ) : (
              <>
                <p className="flex-1 text-muted-foreground text-sm">
                  {t("card.canConfirm")}
                </p>
                <Button
                  type="button"
                  onClick={() => onConfirm(request.id)}
                  disabled={isConfirming}
                >
                  <Check aria-hidden className="size-4" />
                  {t("confirmButton")}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
