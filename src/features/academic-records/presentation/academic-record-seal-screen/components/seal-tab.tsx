"use client";

import { useFormatter, useTranslations } from "next-intl";
import { SealStatusBadge } from "../../academic-record-screen/seal-status-badge";
import type { SealTabVM } from "../academic-record-seal-screen.i-vm";
import { AllLockedGate } from "./all-locked-gate";
import { AuditTrailTable } from "./audit-trail-table";
import { SealConfirmDialog } from "./seal-confirm-dialog";

export interface SealTabProps {
  vm: SealTabVM;
  onGoToApproval: () => void;
}

/**
 * Seal workflow tab — rollup gate + seal-history indicator + audit trail.
 *
 * US-E18.24: the class/term/year selector is HOISTED to the screen (both tabs
 * share one selection now). The sealed indicator reads the REAL rollup: it is
 * honest about the truth-table ambiguity — a non-null `lastSealedAt` with a
 * non-SEALED status means "was sealed, now fully unsealed", which is the ONLY
 * way to tell that apart from "never sealed" (there is no 4th enum value). The
 * signer's name is NOT shown: `sealedBy` has no wire equivalent (the audit
 * trail, still mock, is the only actor-name source).
 */
export function SealTab({ vm, onGoToApproval }: SealTabProps) {
  const t = useTranslations("academicRecordSeal");
  const format = useFormatter();
  const { batch } = vm;

  return (
    <div className="space-y-4">
      {!batch ? (
        <p className="rounded-xl border border-border border-dashed bg-card p-12 text-center text-muted-foreground text-sm">
          {t("emptyBatch")}
        </p>
      ) : (
        <>
          <AllLockedGate
            batch={batch}
            onSeal={vm.onOpenConfirmDialog}
            onGoToApproval={onGoToApproval}
          />

          {batch.lastSealedAt === null ? (
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
              <SealStatusBadge sealed={false} />
              <span className="text-muted-foreground text-sm">
                {t("sealSuccess.neverSealed")}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
              <SealStatusBadge sealed={batch.status === "SEALED"} />
              {batch.status !== "SEALED" && (
                <span className="text-muted-foreground text-sm">
                  {t("sealSuccess.wasSealedThenUnsealed")}
                </span>
              )}
              <span className="text-foreground text-sm tabular-nums">
                <span className="text-muted-foreground">
                  {t("sealSuccess.lastSealedAtLabel")}:{" "}
                </span>
                {format.dateTime(new Date(batch.lastSealedAt), {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}

          <SealConfirmDialog
            open={vm.isConfirmDialogOpen}
            onOpenChange={(o) =>
              o ? vm.onOpenConfirmDialog() : vm.onCloseConfirmDialog()
            }
            batch={batch}
            isPending={vm.isSealing}
            onConfirm={vm.onConfirmSeal}
          />
        </>
      )}

      <AuditTrailTable
        entries={vm.auditTrail}
        isLoading={vm.isAuditTrailLoading}
      />
    </div>
  );
}
