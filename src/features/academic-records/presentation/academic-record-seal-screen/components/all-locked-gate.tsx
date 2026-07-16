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

/**
 * AC-2 (OK, green) vs AC-3 (NOT-OK, warning banner role="alert").
 *
 * US-E18.13 (ADR 0055): the "all grades locked" check is REACTIVE (server-side)
 * — this banner's `allLocked`/`status` come from the mocked, decorative
 * `getSealStatus` and NEVER gate the Seal button. Both branches render a Seal
 * button; the NOT-OK branch additionally warns + links to Approval & Lock. The
 * server rejects with `unlocked-grades-exist` / `too-many-reseals` if the
 * attempt isn't allowed (surfaced via toast by the container). Reseal (batch
 * already SEALED) is idempotent, so the button is never disabled.
 */
export function AllLockedGate({
  batch,
  onSeal,
  onGoToApproval,
}: AllLockedGateProps) {
  const t = useTranslations("academicRecordSeal");
  const alreadySealed = batch.status === "SEALED";
  const sealButtonLabel = alreadySealed ? t("resealButton") : t("sealButton");

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
        <Button type="button" onClick={onSeal} className="shrink-0">
          {sealButtonLabel}
        </Button>
      </div>
    );
  }

  return (
    // A11Y-001: `role="alert"` scopes to the non-interactive message ONLY. The
    // action buttons live in a SIBLING div so a `refetchOnWindowFocus`
    // re-render (sealStatusQuery has staleTime:0) never re-announces focusable
    // controls the user may already be interacting with (ARIA APG).
    <div className="flex flex-col gap-4 rounded-xl border border-edu-warning/30 bg-edu-warning/10 p-5 sm:flex-row sm:items-center">
      <div role="alert" className="flex min-w-0 flex-1 items-start gap-4">
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
              <span className="font-bold text-muted-foreground text-xs uppercase tracking-wide">
                {t("gate.notAllLocked.subjectsLabel")}:{" "}
              </span>
              {batch.unlockedSubjectNames.join(", ")}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          onClick={onGoToApproval}
          className="shrink-0"
        >
          {t("gate.notAllLocked.linkToApproval")}
          <ArrowRight aria-hidden className="size-4" />
        </Button>
        <Button type="button" onClick={onSeal} className="shrink-0">
          {sealButtonLabel}
        </Button>
      </div>
    </div>
  );
}
