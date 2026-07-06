"use client";

import { Clock, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { UnsealTabVM } from "../academic-record-seal-screen.i-vm";
import { UnsealInitiateForm } from "./unseal-initiate-form";
import { UnsealRequestCard } from "./unseal-request-card";
import { UnsealSameAdminDialog } from "./unseal-same-admin-dialog";
import { UnsealSelfApproveDialog } from "./unseal-self-approve-dialog";

export interface UnsealTabProps {
  vm: UnsealTabVM;
}

/** Unseal workflow tab — toolbar + pending/resolved lists + initiate form +
 * the two confirm dialogs (same-admin blocking / self-approve fallback). */
export function UnsealTab({ vm }: UnsealTabProps) {
  const t = useTranslations("academicRecordSeal.unseal");

  const selfApproveTarget =
    vm.selfApproveTargetRequestId === null
      ? null
      : (vm.pendingRequests.find(
          (r) => r.id === vm.selfApproveTargetRequestId,
        ) ?? null);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-base text-foreground">
            {t("toolbar.title")}
          </p>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t("toolbar.subtitle")}
          </p>
        </div>
        <StatusBadge tone="warning">
          <Clock aria-hidden className="size-3" />
          {t("toolbar.pendingBadge", { count: vm.pendingRequests.length })}
        </StatusBadge>
        <Button type="button" onClick={vm.onOpenInitiateForm}>
          <Plus aria-hidden className="size-4" />
          {t("initiateButton")}
        </Button>
      </div>

      {/* Pending */}
      <section className="space-y-3">
        <h2 className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
          {t("sections.pending")} ({vm.pendingRequests.length})
        </h2>
        {vm.isRequestsLoading ? (
          <Skeleton className="h-28 w-full rounded-xl" />
        ) : vm.pendingRequests.length === 0 ? (
          <p className="rounded-xl border border-border border-dashed bg-card p-8 text-center text-muted-foreground text-sm">
            {t("empty.pending")}
          </p>
        ) : (
          vm.pendingRequests.map((r) => (
            <UnsealRequestCard
              key={r.id}
              request={r}
              currentAdminId={vm.currentAdminId}
              tenantAdminCount={vm.tenantAdminCount}
              onConfirm={vm.onConfirmRequest}
              onRequestSelfApprove={vm.onRequestSelfApprove}
              isConfirming={vm.isConfirming}
            />
          ))
        )}
      </section>

      <UnsealInitiateForm
        open={vm.isInitiateFormOpen}
        onOpenChange={(o) =>
          o ? vm.onOpenInitiateForm() : vm.onCloseInitiateForm()
        }
        studentOptions={vm.sealedStudentOptions}
        isStudentOptionsLoading={vm.isSealedStudentOptionsLoading}
        isPending={vm.isInitiating}
        onSubmit={vm.onSubmitInitiate}
      />

      <UnsealSameAdminDialog
        open={vm.sameAdminErrorRequestId !== null}
        onOpenChange={(o) => {
          if (!o) vm.onDismissSameAdminError();
        }}
      />

      <UnsealSelfApproveDialog
        open={selfApproveTarget !== null}
        request={selfApproveTarget}
        currentAdminId={vm.currentAdminId}
        currentAdminName={vm.currentAdminName}
        isPending={vm.isConfirming}
        onCancel={vm.onDismissSelfApprove}
        onConfirm={vm.onConfirmSelfApprove}
      />
    </div>
  );
}
