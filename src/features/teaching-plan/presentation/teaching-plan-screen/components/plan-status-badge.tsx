"use client";

import { useTranslations } from "next-intl";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import type { TeachingPlanStatus } from "../../../domain/entities/teaching-plan-status.entity";

const STATUS_TONE: Record<TeachingPlanStatus, StatusTone> = {
  DRAFT: "muted",
  SUBMITTED: "primary",
  APPROVED: "success",
  REJECTED: "error",
};

export function PlanStatusBadge({ status }: { status: TeachingPlanStatus }) {
  const t = useTranslations("teachingPlan");
  return (
    <StatusBadge tone={STATUS_TONE[status]}>
      {t(`status.${status}`)}
    </StatusBadge>
  );
}
