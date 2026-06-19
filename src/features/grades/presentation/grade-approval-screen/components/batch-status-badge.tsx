"use client";

import { CheckCircle2, Clock, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";
import type { BatchStatus } from "../../../domain/entities/grade-approval-batch.entity";

const TONE = {
  PENDING_APPROVAL: {
    cls: "bg-edu-warning/15 text-edu-warning-foreground",
    labelKey: "statusPendingApproval",
  },
  PUBLISHED: {
    cls: "bg-edu-success/15 text-edu-success-text",
    labelKey: "statusPublished",
  },
  LOCKED: {
    cls: "bg-muted text-foreground",
    labelKey: "statusLocked",
  },
} as const;

const ICON: Record<BatchStatus, typeof Clock> = {
  PENDING_APPROVAL: Clock,
  PUBLISHED: CheckCircle2,
  LOCKED: Lock,
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const t = useTranslations("gradeApproval");
  const tone = TONE[status];
  const Icon = ICON[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        tone.cls,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {t(tone.labelKey)}
    </span>
  );
}
