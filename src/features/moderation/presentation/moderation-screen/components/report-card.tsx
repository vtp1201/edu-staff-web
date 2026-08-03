"use client";

import { useTranslations } from "next-intl";
import { AbsentValue } from "@/components/shared/absent-value";
import { StatusBadge } from "@/components/shared/status-badge/status-badge";
import {
  type ReportEntity,
  type ReportRef,
  reportRefOf,
} from "../../../domain/entities/report.entity";
import { formatReportRow } from "./format-report-row";
import { ReportStatusBadge } from "./report-status-badge";

export interface ReportCardListProps {
  reports: ReportEntity[];
  /** Whole addressing tuple — see {@link ReportTableProps.onOpen}. */
  onOpen: (ref: ReportRef) => void;
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
  const tRoot = useTranslations("moderation");

  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {reports.map((report) => {
        const row = formatReportRow(report);
        return (
          <li key={row.id}>
            <button
              type="button"
              aria-label={t("openDetail", { id: row.id })}
              onClick={() => onOpen(reportRefOf(report))}
              className="flex w-full flex-col gap-2 rounded-[var(--edu-radius-card)] border border-border bg-card p-4 text-left shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground text-xs">
                  {tKind(row.kind)}
                  {row.authorName ? ` · ${row.authorName}` : ""}
                </span>
                <ReportStatusBadge status={row.status} />
              </div>
              {/* No preview on the wire — fall back to the target id. */}
              <p className="line-clamp-2 font-medium text-foreground text-sm">
                {row.contentPreview ?? row.contentId}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <StatusBadge tone="muted">{tReason(row.reason)}</StatusBadge>
                {row.reporterName ? (
                  <span className="text-muted-foreground">
                    {row.reporterName}
                  </span>
                ) : (
                  <AbsentValue label={tRoot("unavailable")} />
                )}
                <span className="text-muted-foreground">
                  · {row.createdAtLabel}
                </span>
                {row.duplicateCount !== null && row.duplicateCount > 0 && (
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
