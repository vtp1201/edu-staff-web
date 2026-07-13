"use client";

import { BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SubjectAverageEntity } from "@/features/principal/domain/reports/entities/subject-average.entity";
import type { PrincipalReportsFailure } from "@/features/principal/domain/reports/failures/principal-reports.failure";
import { ChartSkeleton } from "./chart-skeleton";
import { RegionEmptyState } from "./region-empty-state";
import { RegionErrorState } from "./region-error-state";
import { SubjectAverageChart } from "./subject-average-chart";

export type ChartRegionStatus = "loading" | "error" | "empty" | "success";

export interface SubjectAverageChartRegionProps {
  status: ChartRegionStatus;
  data: SubjectAverageEntity[];
  errorKey: PrincipalReportsFailure["type"] | null;
  onRetry: () => void;
}

export function SubjectAverageChartRegion({
  status,
  data,
  errorKey,
  onRetry,
}: SubjectAverageChartRegionProps) {
  const t = useTranslations("reports.charts.subjectAverage");
  if (status === "loading")
    return <ChartSkeleton columnCount={8} srLabel={t("loading")} />;
  if (status === "error") {
    return (
      <RegionErrorState errorKey={errorKey ?? "unknown"} onRetry={onRetry} />
    );
  }
  if (status === "empty") {
    return (
      <RegionEmptyState
        icon={BarChart3}
        title={t("emptyTitle")}
        desc={t("emptyDesc")}
      />
    );
  }
  return <SubjectAverageChart subjects={data} />;
}
