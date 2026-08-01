"use client";

import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { SealStatusRollup } from "../../../domain/entities/seal-batch.entity";

export interface AllLockedGateProps {
  batch: SealStatusRollup;
  onSeal: () => void; // OK branch — opens SealConfirmDialog
  onGoToApproval: () => void; // NOT-OK branch — link to E14.4 grade-approval
}

/** Reseal count at which the near-cap caption appears (server cap is 5). */
const RESEAL_CAP_WARNING_AT = 4;

/**
 * Class+term seal-rollup banner (AC-2 green / AC-3 warning).
 *
 * US-E18.24: driven by the REAL `GET .../seal-status` rollup
 * (`status: PENDING|SEALED|PARTIAL` + counts), replacing the old decorative
 * `allLocked` / `unlockedSubjectNames` mock hint. The per-subject "which
 * subjects are unlocked" list is GONE — that data does not exist on the wire at
 * this granularity, so rendering it would be fabricated.
 *
 * The rollup is a PROACTIVE status readout, never a permission: the "all grades
 * locked" check stays REACTIVE (server-side). Every branch renders a Seal
 * button; the non-SEALED branch additionally warns + links to Approval & Lock.
 * The server rejects with `unlocked-grades-exist` / `too-many-reseals` when the
 * attempt isn't allowed (surfaced via toast by the container). Reseal is
 * idempotent, so the button is never disabled.
 */
export function AllLockedGate({
  batch,
  onSeal,
  onGoToApproval,
}: AllLockedGateProps) {
  const t = useTranslations("academicRecordSeal");
  const isSealed = batch.status === "SEALED";
  const sealButtonLabel = isSealed ? t("resealButton") : t("sealButton");
  const counts = t("gate.rollup.counts", {
    total: batch.totalStudents,
    sealed: batch.sealedCount,
    unsealed: batch.unsealedCount,
  });
  const nearCap =
    batch.resealCount >= RESEAL_CAP_WARNING_AT
      ? t("gate.rollup.nearResealCap", { count: batch.resealCount })
      : null;

  if (isSealed) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-edu-success/30 bg-edu-success/10 p-5 sm:flex-row sm:items-center">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-edu-success/15">
          <CheckCircle2 aria-hidden className="size-6 text-edu-success-text" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-base text-foreground">
            {t("gate.rollup.sealedTitle")}
          </p>
          <p className="mt-0.5 text-muted-foreground text-sm">{counts}</p>
          {nearCap && (
            <p className="mt-1 text-edu-warning-foreground text-sm">
              {nearCap}
            </p>
          )}
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
            {batch.status === "PARTIAL"
              ? t("gate.rollup.partialTitle", {
                  sealed: batch.sealedCount,
                  total: batch.totalStudents,
                })
              : t("gate.rollup.pendingTitle")}
          </p>
          <p className="mt-0.5 text-muted-foreground text-sm">{counts}</p>
          <p className="mt-2 text-muted-foreground text-sm">
            {t("gate.rollup.warning")}
          </p>
          {nearCap && (
            <p className="mt-1 text-edu-warning-foreground text-sm">
              {nearCap}
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
          {t("gate.rollup.linkToApproval")}
          <ArrowRight aria-hidden className="size-4" />
        </Button>
        <Button type="button" onClick={onSeal} className="shrink-0">
          {sealButtonLabel}
        </Button>
      </div>
    </div>
  );
}
