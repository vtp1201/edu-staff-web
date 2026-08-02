"use client";

import { ArrowUpCircle, Ban, Check, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge/status-badge";
import type { ReportStatus } from "../../../domain/entities/report.entity";
import { reportStatusTone } from "./format-report-row";

const STATUS_ICON: Record<ReportStatus, typeof Clock> = {
  pending: Clock,
  dismissed: Check,
  removed: Ban,
  // Read-only outcome: another ADMIN escalated this report (US-E18.32).
  escalated: ArrowUpCircle,
};

/** Report status badge — icon + text (never color-only, NFR-102). */
export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const t = useTranslations("moderation.statusLabels");
  const Icon = STATUS_ICON[status];
  return (
    <StatusBadge tone={reportStatusTone(status)} className="gap-1">
      <Icon aria-hidden="true" className="size-3" />
      {t(status)}
    </StatusBadge>
  );
}
