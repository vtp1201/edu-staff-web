"use client";

import { FileX2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReportListItemEntity } from "@/features/principal/domain/reports/entities/report-list-item.entity";
import type { PrincipalReportsFailure } from "@/features/principal/domain/reports/failures/principal-reports.failure";
import { NewReportButton } from "./new-report-button";
import { PeriodicReportsTable } from "./periodic-reports-table";
import { RegionEmptyState } from "./region-empty-state";
import { RegionErrorState } from "./region-error-state";
import { TableRowSkeleton } from "./table-row-skeleton";

export type TableRegionStatus = "loading" | "error" | "empty" | "success";

export interface PeriodicReportsTableRegionProps {
  status: TableRegionStatus;
  reports: ReportListItemEntity[];
  errorKey: PrincipalReportsFailure["type"] | null;
  onRetry: () => void;
  onNewReport: () => void;
  isGeneratingNewReport: boolean;
}

const SKELETON_ROWS = ["s0", "s1", "s2", "s3", "s4"];

/**
 * Periodic-reports table region (FR-006/FR-007). The header (title +
 * NewReportButton) ALWAYS renders regardless of body status (D-4) — a principal
 * can request a new report while the list is empty or erroring.
 */
export function PeriodicReportsTableRegion({
  status,
  reports,
  errorKey,
  onRetry,
  onNewReport,
  isGeneratingNewReport,
}: PeriodicReportsTableRegionProps) {
  const t = useTranslations("reports.table");
  return (
    <section className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="text-[15px] font-extrabold text-foreground">
          {t("title")}
        </h3>
        <NewReportButton
          onClick={onNewReport}
          isPending={isGeneratingNewReport}
        />
      </div>

      {status === "loading" && (
        <div role="status" aria-busy="true">
          <span className="sr-only">{t("loading")}</span>
          {SKELETON_ROWS.map((key) => (
            <TableRowSkeleton key={key} />
          ))}
        </div>
      )}

      {status === "error" && (
        <div className="p-4">
          <RegionErrorState
            errorKey={errorKey ?? "unknown"}
            onRetry={onRetry}
          />
        </div>
      )}

      {status === "empty" && (
        <div className="p-4">
          <RegionEmptyState
            icon={FileX2}
            title={t("emptyTitle")}
            desc={t("emptyDesc")}
          />
        </div>
      )}

      {status === "success" && <PeriodicReportsTable reports={reports} />}
    </section>
  );
}
