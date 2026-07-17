"use client";

import { Check, PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import type { QuestionStatus } from "../../domain/entities/question.entity";

export interface QBStatusChipProps {
  status: QuestionStatus;
}

/**
 * DRAFT/PUBLISHED status chip — 2-value convention (DRAFT→warning,
 * PUBLISHED→success), icon + label always (NFR-001). Thin wrapper over the
 * shared `StatusBadge` (mirrors lesson-plan's inline StatusBadge usage).
 */
export function QBStatusChip({ status }: QBStatusChipProps) {
  const t = useTranslations("questionBank.status");
  const draft = status === "DRAFT";
  return (
    <StatusBadge tone={draft ? "warning" : "success"}>
      {draft ? (
        <PenLine className="size-3" aria-hidden="true" />
      ) : (
        <Check className="size-3" aria-hidden="true" />
      )}
      {draft ? t("draft") : t("published")}
    </StatusBadge>
  );
}
