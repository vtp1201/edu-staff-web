"use client";

import { useFormatter, useTranslations } from "next-intl";
import { SealStatusBadge } from "../../academic-record-screen/seal-status-badge";
import type { SealTabVM } from "../academic-record-seal-screen.i-vm";
import { AllLockedGate } from "./all-locked-gate";
import { AuditTrailTable } from "./audit-trail-table";
import { ClassTermYearSelector } from "./class-term-year-selector";
import { SealConfirmDialog } from "./seal-confirm-dialog";

export interface SealTabProps {
  vm: SealTabVM;
  onGoToApproval: () => void;
}

/** Seal workflow tab — selector + allLocked gate + sealed indicator + audit. */
export function SealTab({ vm, onGoToApproval }: SealTabProps) {
  const t = useTranslations("academicRecordSeal");
  const format = useFormatter();
  const { batch } = vm;

  return (
    <div className="space-y-4">
      <ClassTermYearSelector
        year={vm.year}
        term={vm.term}
        classId={vm.classId}
        classOptions={vm.classOptions}
        isClassOptionsLoading={vm.isClassOptionsLoading}
        onYearChange={vm.onYearChange}
        onTermChange={vm.onTermChange}
        onClassChange={vm.onClassChange}
      />

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

          {batch.status === "SEALED" && batch.sealedAt && (
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
              <SealStatusBadge sealed />
              {batch.sealedBy && (
                <span className="text-foreground text-sm">
                  <span className="text-muted-foreground">
                    {t("sealSuccess.sealedByLabel")}:{" "}
                  </span>
                  <strong>{batch.sealedBy}</strong>
                </span>
              )}
              <span className="text-foreground text-sm tabular-nums">
                <span className="text-muted-foreground">
                  {t("sealSuccess.sealedAtLabel")}:{" "}
                </span>
                {format.dateTime(new Date(batch.sealedAt), {
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
