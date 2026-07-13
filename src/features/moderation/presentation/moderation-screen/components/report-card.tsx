"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge/status-badge";
import type { ReportEntity } from "../../../domain/entities/report.entity";
import { formatReportRow } from "./format-report-row";
import { ReportStatusBadge } from "./report-status-badge";

export interface ReportCardListProps {
  reports: ReportEntity[];
  onOpen: (reportId: string) => void;
}

/**
 * Mobile stacked-card variant (block md:hidden — the ≤760px switch). Same
 * semantic fields/labels as ReportTable (identical info to AT regardless of
 * viewport). The whole card is one button (no nested interactive).
 */
export function ReportCardList({ reports, onOpen }: ReportCardListProps) {
  const t = useTranslations("moderation.table");
  const tReason = useTranslations("moderation.reportDialog.reasons");
  const tKind = useTranslations("moderation.kinds");

  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {reports.map((report) => {
        const row = formatReportRow(report);
        return (
          <li key={row.id}>
            <button
              type="button"
              aria-label={t("openDetail", { id: row.id })}
              onClick={() => onOpen(row.id)}
              className="flex w-full flex-col gap-2 rounded-[var(--edu-radius-card)] border border-border bg-card p-4 text-left shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground text-xs">
                  {tKind(row.kind)} · {row.authorName}
                </span>
                <ReportStatusBadge status={row.status} />
              </div>
              <p className="line-clamp-2 font-medium text-foreground text-sm">
                {row.contentPreview}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <StatusBadge tone="muted">{tReason(row.reason)}</StatusBadge>
                <span className="text-muted-foreground">
                  {row.reporterName}
                </span>
                <span className="text-muted-foreground">
                  · {row.createdAtLabel}
                </span>
                {row.duplicateCount > 0 && (
                  <span className="text-muted-foreground">
                    · {t("duplicateSuffix", { count: row.duplicateCount })}
                  </span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
