"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { TeachingPlanFailure } from "../../domain/failures/teaching-plan.failure";
import { type PlanCellDraft, PlanCellForm } from "./components/plan-cell-form";
import { PlanStatusBadge } from "./components/plan-status-badge";
import { SubjectClassTermSelector } from "./components/subject-class-term-selector";
import { TeachingPlanGrid } from "./components/teaching-plan-grid";
import { TeachingPlanSkeleton } from "./components/teaching-plan-skeleton";
import type {
  SelectorVM,
  TeachingPlanScreenVM,
} from "./teaching-plan-screen.i-vm";

type ActionResult =
  | { ok: true }
  | { ok: false; errorKey: TeachingPlanFailure["type"] };

export type TeachingPlanScreenProps = {
  vm: TeachingPlanScreenVM;
  loading?: boolean;
  savePlanCellAction: (
    planId: string,
    cell: PlanCellDraft,
  ) => Promise<ActionResult>;
  submitTeachingPlanAction: (planId: string) => Promise<ActionResult>;
  /** Storybook override for selector navigation (defaults to URL searchParams). */
  onSelect?: (field: "subject" | "class" | "term", value: string) => void;
};

export function TeachingPlanScreen({
  vm,
  loading = false,
  savePlanCellAction,
  submitTeachingPlanAction,
  onSelect,
}: TeachingPlanScreenProps) {
  const t = useTranslations("teachingPlan");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [openEmptyForm, setOpenEmptyForm] = useState(false);

  const { plan, selector } = vm;
  const editable = plan?.status === "DRAFT" || plan?.status === "REJECTED";

  const handleSelect = (field: "subject" | "class" | "term", value: string) => {
    if (onSelect) {
      onSelect(field, value);
      return;
    }
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    sp.set(field, value);
    startTransition(() => {
      router.replace(`${pathname}?${sp.toString()}`);
    });
  };

  const handleSaveCell = (draft: PlanCellDraft) => {
    if (!plan) return;
    startTransition(async () => {
      const res = await savePlanCellAction(plan.id, draft);
      if (!res.ok) {
        toast.error(t(`errors.${res.errorKey}`));
        return;
      }
      setOpenEmptyForm(false);
      router.refresh();
    });
  };

  const handleSubmit = () => {
    if (!plan) return;
    startTransition(async () => {
      const res = await submitTeachingPlanAction(plan.id);
      if (!res.ok) {
        toast.error(t(`errors.${res.errorKey}`));
        return;
      }
      toast.success(t("actions.submitSuccess"));
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-extrabold text-2xl text-foreground">
          {t("pageTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("teacherSubtitle")}</p>
      </header>

      <SubjectClassTermSelector selector={selector} onChange={handleSelect} />

      {loading ? (
        <TeachingPlanSkeleton />
      ) : plan ? (
        <PlanBody
          plan={plan}
          editable={editable}
          isPending={isPending}
          openEmptyForm={openEmptyForm}
          onToggleEmptyForm={setOpenEmptyForm}
          onSaveCell={handleSaveCell}
          onSubmit={handleSubmit}
        />
      ) : (
        <EmptyState selector={selector} />
      )}
    </div>
  );
}

function PlanBody({
  plan,
  editable,
  isPending,
  openEmptyForm,
  onToggleEmptyForm,
  onSaveCell,
  onSubmit,
}: {
  plan: NonNullable<TeachingPlanScreenVM["plan"]>;
  editable: boolean;
  isPending: boolean;
  openEmptyForm: boolean;
  onToggleEmptyForm: (open: boolean) => void;
  onSaveCell: (draft: PlanCellDraft) => void;
  onSubmit: () => void;
}) {
  const t = useTranslations("teachingPlan");
  const hasCells = plan.cells.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="font-bold text-foreground text-sm">
          {plan.subjectName} · {plan.className} · {plan.term}
        </span>
        <PlanStatusBadge status={plan.status} />
      </div>

      {plan.status === "REJECTED" && plan.rejectionReason ? (
        <RejectedBanner reason={plan.rejectionReason} />
      ) : null}

      {!hasCells && editable ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--edu-radius-card)] border border-border border-dashed bg-card px-6 py-12 text-center">
          <p className="text-muted-foreground text-sm">
            {t("grid.emptyState")}
          </p>
          {openEmptyForm ? (
            <div className="w-full max-w-md text-left">
              <PlanCellForm
                week={1}
                period={1}
                isPending={isPending}
                onSave={onSaveCell}
                onCancel={() => onToggleEmptyForm(false)}
              />
            </div>
          ) : (
            <Button type="button" onClick={() => onToggleEmptyForm(true)}>
              {t("grid.emptyStateCta")}
            </Button>
          )}
        </div>
      ) : (
        <TeachingPlanGrid
          weeks={plan.weeks}
          periodsPerWeek={plan.periodsPerWeek}
          cells={plan.cells}
          editable={editable}
          isPending={isPending}
          onSaveCell={onSaveCell}
        />
      )}

      <footer className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={!editable || isPending}
        >
          {t("actions.saveDraft")}
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!editable || isPending}
        >
          {isPending ? t("actions.submitting") : t("actions.submit")}
        </Button>
      </footer>
    </div>
  );
}

function RejectedBanner({ reason }: { reason: string }) {
  const t = useTranslations("teachingPlan.rejection");
  return (
    <div className="flex flex-col gap-1 rounded-[var(--edu-radius-card)] border border-edu-error/30 bg-edu-error/10 px-4 py-3">
      <p className="font-bold text-edu-error-text text-sm">
        {t("bannerTitle")}
      </p>
      <p className="text-foreground text-sm">{t("reason", { reason })}</p>
      <p className="text-muted-foreground text-xs">{t("editHint")}</p>
    </div>
  );
}

function EmptyState({ selector }: { selector: SelectorVM }) {
  const t = useTranslations("teachingPlan");
  const ready =
    selector.selectedSubjectId &&
    selector.selectedClassId &&
    selector.selectedTerm;
  return (
    <div
      role="status"
      className="rounded-[var(--edu-radius-card)] border border-border border-dashed bg-card px-6 py-16 text-center text-muted-foreground text-sm"
    >
      {ready ? t("grid.emptyState") : t("grid.emptyStateCta")}
    </div>
  );
}
