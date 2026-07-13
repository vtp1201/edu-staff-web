"use client";

import { CalendarCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AttendanceTrendPointEntity } from "@/features/principal/domain/reports/entities/attendance-trend-point.entity";
import type { PrincipalReportsFailure } from "@/features/principal/domain/reports/failures/principal-reports.failure";
import { AttendanceTrendChart } from "./attendance-trend-chart";
import { ChartSkeleton } from "./chart-skeleton";
import { RegionEmptyState } from "./region-empty-state";
import { RegionErrorState } from "./region-error-state";
import type { ChartRegionStatus } from "./subject-average-chart-region";

export interface AttendanceTrendChartRegionProps {
  status: ChartRegionStatus;
  data: AttendanceTrendPointEntity[];
  errorKey: PrincipalReportsFailure["type"] | null;
  onRetry: () => void;
}

export function AttendanceTrendChartRegion({
  status,
  data,
  errorKey,
  onRetry,
}: AttendanceTrendChartRegionProps) {
  const t = useTranslations("reports.charts.attendanceTrend");
  if (status === "loading")
    return <ChartSkeleton columnCount={6} srLabel={t("loading")} />;
  if (status === "error") {
    return (
      <RegionErrorState errorKey={errorKey ?? "unknown"} onRetry={onRetry} />
    );
  }
  if (status === "empty") {
    return (
      <RegionEmptyState
        icon={CalendarCheck}
        title={t("emptyTitle")}
        desc={t("emptyDesc")}
      />
    );
  }
  return <AttendanceTrendChart weeks={data} />;
}
