"use client";

import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { SealBatchStatus } from "../../../domain/entities/seal-batch.entity";

export interface AllLockedGateProps {
  batch: SealBatchStatus;
  onSeal: () => void; // OK branch — opens SealConfirmDialog
  onGoToApproval: () => void; // NOT-OK branch — link to E14.4 grade-approval
}

/** AC-2 (OK, green) vs AC-3 (NOT-OK, warning banner role="alert"). */
export function AllLockedGate({
  batch,
  onSeal,
  onGoToApproval,
}: AllLockedGateProps) {
  const t = useTranslations("academicRecordSeal");
  const alreadySealed = batch.status === "SEALED";

  if (batch.allLocked) {
    const sealedCount = alreadySealed ? batch.totalStudents : 0;
    const pendingCount = alreadySealed ? 0 : batch.totalStudents;
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-edu-success/30 bg-edu-success/10 p-5 sm:flex-row sm:items-center">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-edu-success/15">
          <CheckCircle2 aria-hidden className="size-6 text-edu-success-text" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-base text-foreground">
            {t("gate.allLocked.title")}
          </p>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t("gate.allLocked.subtitle", {
              total: batch.totalStudents,
              pending: pendingCount,
              sealed: sealedCount,
            })}
          </p>
        </div>
        <Button
          type="button"
          onClick={onSeal}
          disabled={alreadySealed}
          className="shrink-0"
        >
          {t("sealButton")}
        </Button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex flex-col gap-4 rounded-xl border border-edu-warning/30 bg-edu-warning/10 p-5 sm:flex-row sm:items-center"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-edu-warning/15">
        <AlertTriangle
          aria-hidden
          className="size-6 text-edu-warning-foreground"
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-base text-foreground">
          {t("gate.notAllLocked.title", { count: batch.unlockedStudents })}
        </p>
        <p className="mt-0.5 text-muted-foreground text-sm">
          {t("gate.notAllLocked.warning")}
        </p>
        {batch.unlockedSubjectNames.length > 0 && (
          <p className="mt-2 text-foreground text-sm">
            <span className="font-bold text-edu-text-muted text-xs uppercase tracking-wide">
              {t("gate.notAllLocked.subjectsLabel")}:{" "}
            </span>
            {batch.unlockedSubjectNames.join(", ")}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onGoToApproval}
        className="shrink-0"
      >
        {t("gate.notAllLocked.linkToApproval")}
        <ArrowRight aria-hidden className="size-4" />
      </Button>
    </div>
  );
}
