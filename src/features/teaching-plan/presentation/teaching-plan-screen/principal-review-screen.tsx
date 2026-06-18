"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { TeachingPlanFailure } from "../../domain/failures/teaching-plan.failure";
import { ApproveDialog } from "./components/approve-dialog";
import { PlanStatusBadge } from "./components/plan-status-badge";
import { RejectDialog } from "./components/reject-dialog";
import { TeachingPlanGrid } from "./components/teaching-plan-grid";
import type { TeachingPlanVM } from "./teaching-plan-screen.i-vm";

type ActionResult =
  | { ok: true }
  | { ok: false; errorKey: TeachingPlanFailure["type"] };

export type PrincipalReviewScreenProps = {
  pendingPlans: TeachingPlanVM[];
  approveTeachingPlanAction: (planId: string) => Promise<ActionResult>;
  rejectTeachingPlanAction: (
    planId: string,
    reason: string,
  ) => Promise<ActionResult>;
};

export function PrincipalReviewScreen({
  pendingPlans,
  approveTeachingPlanAction,
  rejectTeachingPlanAction,
}: PrincipalReviewScreenProps) {
  const t = useTranslations("teachingPlan");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [approveFor, setApproveFor] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);

  const handleApprove = (planId: string) => {
    startTransition(async () => {
      const res = await approveTeachingPlanAction(planId);
      if (!res.ok) {
        toast.error(t(`errors.${res.errorKey}`));
        return;
      }
      toast.success(t("actions.approveSuccess"));
      setApproveFor(null);
      router.refresh();
    });
  };

  const handleReject = (planId: string, reason: string) => {
    startTransition(async () => {
      const res = await rejectTeachingPlanAction(planId, reason);
      if (!res.ok) {
        toast.error(t(`errors.${res.errorKey}`));
        return;
      }
      toast.success(t("actions.rejectSuccess"));
      setRejectFor(null);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-extrabold text-2xl text-foreground">
          {t("pageTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("principalSubtitle")}
        </p>
      </header>

      {pendingPlans.length === 0 ? (
        <div
          role="status"
          className="rounded-[var(--edu-radius-card)] border border-border border-dashed bg-card px-6 py-16 text-center text-muted-foreground text-sm"
        >
          {t("principal.emptyPending")}
        </div>
      ) : (
        <ul className="flex flex-col gap-6">
          {pendingPlans.map((plan) => (
            <li
              key={plan.id}
              className="flex flex-col gap-4 rounded-[var(--edu-radius-card)] border border-border bg-card p-5 shadow-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-card-foreground text-base">
                      {plan.subjectName} · {plan.className} · {plan.term}
                    </span>
                    <PlanStatusBadge status={plan.status} />
                  </div>
                  {plan.teacherName ? (
                    <span className="text-muted-foreground text-xs">
                      {t("principal.submittedBy", { name: plan.teacherName })}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => setRejectFor(plan.id)}
                  >
                    {t("actions.reject")}
                  </Button>
                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={() => setApproveFor(plan.id)}
                  >
                    {t("actions.approve")}
                  </Button>
                </div>
              </div>

              <TeachingPlanGrid
                weeks={plan.weeks}
                periodsPerWeek={plan.periodsPerWeek}
                cells={plan.cells}
                editable={false}
                isPending={isPending}
                onSaveCell={() => {}}
              />
            </li>
          ))}
        </ul>
      )}

      <ApproveDialog
        open={approveFor !== null}
        onOpenChange={(o) => setApproveFor(o ? approveFor : null)}
        isPending={isPending}
        onConfirm={() => approveFor && handleApprove(approveFor)}
      />
      <RejectDialog
        open={rejectFor !== null}
        onOpenChange={(o) => setRejectFor(o ? rejectFor : null)}
        isPending={isPending}
        onConfirm={(reason) => rejectFor && handleReject(rejectFor, reason)}
      />
    </div>
  );
}
