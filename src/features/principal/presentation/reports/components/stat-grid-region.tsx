"use client";

import { Award, ShieldAlert, UserCheck, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatCard, type StatTone } from "@/components/shared/stat-card";
import { StatCardSkeletonGrid } from "@/components/shared/stat-card-skeleton";
import type { ReportsSummaryEntity } from "@/features/principal/domain/reports/entities/reports-summary.entity";
import type { PrincipalReportsFailure } from "@/features/principal/domain/reports/failures/principal-reports.failure";
import { RegionErrorState } from "./region-error-state";

export type StatGridStatus = "loading" | "error" | "success";

export interface StatGridRegionProps {
  status: StatGridStatus;
  data: ReportsSummaryEntity | null;
  errorKey: PrincipalReportsFailure["type"] | null;
  onRetry: () => void;
}

/** Build a trend chip only when the baseline exists (FR-004 AC-04.2 — never a
 *  misleading 0%). */
function trend(
  value: number | null,
): { dir: "up" | "down"; value: string } | undefined {
  if (value == null) return undefined;
  return { dir: value >= 0 ? "up" : "down", value: `${Math.abs(value)}%` };
}

/** Format the school-average to one decimal, others as-is. */
function num(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function StatGridRegion({
  status,
  data,
  errorKey,
  onRetry,
}: StatGridRegionProps) {
  const t = useTranslations("reports");

  if (status === "loading") {
    return (
      <StatCardSkeletonGrid count={4} srLabel={t("stats.loading")} announce />
    );
  }
  if (status === "error") {
    return (
      <RegionErrorState errorKey={errorKey ?? "unknown"} onRetry={onRetry} />
    );
  }
  if (!data) return null;

  const cards: {
    key: string;
    icon: typeof Users;
    tone: StatTone;
    label: string;
    value: string;
    trendValue: number | null;
  }[] = [
    {
      key: "totalStudents",
      icon: Users,
      tone: "primary",
      label: t("stats.totalStudents"),
      value: num(data.totalStudents),
      trendValue: data.totalStudentsTrend,
    },
    {
      key: "schoolAverage",
      icon: Award,
      tone: "success",
      label: t("stats.schoolAverage"),
      value: data.schoolAverage.toFixed(2),
      trendValue: data.schoolAverageTrend,
    },
    {
      key: "attendanceRate",
      icon: UserCheck,
      tone: "warning",
      label: t("stats.attendanceRate"),
      value: `${num(data.attendanceRate)}%`,
      trendValue: data.attendanceRateTrend,
    },
    {
      key: "incidents",
      icon: ShieldAlert,
      tone: "error",
      label: t("stats.incidents"),
      value: num(data.incidentCount),
      trendValue: data.incidentCountTrend,
    },
  ];

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
      {cards.map((c) => (
        <StatCard
          key={c.key}
          icon={c.icon}
          tone={c.tone}
          label={c.label}
          value={c.value}
          trend={trend(c.trendValue)}
        />
      ))}
    </div>
  );
}
