"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AttendanceTrendPointEntity } from "@/features/principal/domain/reports/entities/attendance-trend-point.entity";
import type { ReportListItemEntity } from "@/features/principal/domain/reports/entities/report-list-item.entity";
import type {
  ReportsSummaryEntity,
  Term,
} from "@/features/principal/domain/reports/entities/reports-summary.entity";
import type { SubjectAverageEntity } from "@/features/principal/domain/reports/entities/subject-average.entity";
import type { PrincipalReportsFailure } from "@/features/principal/domain/reports/failures/principal-reports.failure";
import { AttendanceTrendChartRegion } from "./components/attendance-trend-chart-region";
import { PeriodicReportsTableRegion } from "./components/periodic-reports-table-region";
import { ReportsToolbar } from "./components/reports-toolbar";
import { StatGridRegion } from "./components/stat-grid-region";
import { SubjectAverageChartRegion } from "./components/subject-average-chart-region";
import {
  downloadReportsCsv,
  type ExportReportsLabels,
} from "./export/export-reports-to-excel";
import { principalReportsKeys } from "./principal-reports-keys";
import { getReportsPollInterval } from "./reports-poll";
import type { ActionResult, ReportsScreenProps } from "./reports-screen.i-vm";

const VALID_TERMS: Term[] = ["HK1", "HK2", "FULL_YEAR"];
const isValidTerm = (v: string | null): v is Term =>
  v !== null && (VALID_TERMS as string[]).includes(v);

/** Unwrap an ActionResult in a queryFn: throw `{ errorKey }` on failure so
 *  useQuery's own isError/error reflects it (state-design.md §9). */
async function unwrap<T>(p: Promise<ActionResult<T>>): Promise<T> {
  const result = await p;
  if (!result.ok) throw { errorKey: result.errorKey };
  return result.data;
}

function errorKeyOf(error: unknown): PrincipalReportsFailure["type"] {
  if (error && typeof error === "object" && "errorKey" in error) {
    return (error as { errorKey: PrincipalReportsFailure["type"] }).errorKey;
  }
  return "unknown";
}

type LeafStatus = "loading" | "error" | "empty" | "success";

function listStatus(
  isLoading: boolean,
  isError: boolean,
  length: number,
): LeafStatus {
  if (isLoading) return "loading";
  if (isError) return "error";
  return length === 0 ? "empty" : "success";
}

export function ReportsScreen({
  initialTerm,
  getReportsSummaryAction,
  getSubjectAveragesAction,
  getAttendanceTrendAction,
  getPeriodicReportsAction,
  generateReportAction,
}: ReportsScreenProps) {
  const t = useTranslations("reports");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const urlTerm = searchParams.get("termId");
  const term: Term = isValidTerm(urlTerm) ? urlTerm : initialTerm;

  // Canonicalize the URL once if termId is absent/invalid (AC-01.2 — no flash).
  useEffect(() => {
    if (!isValidTerm(urlTerm)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("termId", initialTerm);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [urlTerm, initialTerm, pathname, router, searchParams]);

  const summaryQuery = useQuery({
    queryKey: principalReportsKeys.summary(term),
    queryFn: () => unwrap<ReportsSummaryEntity>(getReportsSummaryAction(term)),
    staleTime: 120_000,
    gcTime: 600_000,
  });
  const subjectsQuery = useQuery({
    queryKey: principalReportsKeys.subjectAverages(term),
    queryFn: () =>
      unwrap<SubjectAverageEntity[]>(getSubjectAveragesAction(term)),
    staleTime: 120_000,
    gcTime: 600_000,
  });
  const attendanceQuery = useQuery({
    queryKey: principalReportsKeys.attendanceTrend(term),
    queryFn: () =>
      unwrap<AttendanceTrendPointEntity[]>(getAttendanceTrendAction(term)),
    staleTime: 120_000,
    gcTime: 600_000,
  });
  const listQuery = useQuery({
    queryKey: principalReportsKeys.list(term),
    queryFn: () =>
      unwrap<ReportListItemEntity[]>(getPeriodicReportsAction(term)),
    staleTime: 30_000,
    gcTime: 300_000,
    refetchInterval: (query) =>
      getReportsPollInterval(query.state.data as ReportListItemEntity[]),
  });

  const generateMutation = useMutation({
    mutationFn: () => unwrap<ReportListItemEntity>(generateReportAction(term)),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: principalReportsKeys.list(term),
      });
      toast.success(t("table.generateSuccess"));
    },
    onError: (error) => {
      toast.error(t(`errors.${errorKeyOf(error)}`));
    },
  });

  const onTermChange = useCallback(
    (next: Term) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("termId", next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        summaryQuery.refetch(),
        subjectsQuery.refetch(),
        attendanceQuery.refetch(),
        listQuery.refetch(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [summaryQuery, subjectsQuery, attendanceQuery, listQuery]);

  // Export Excel (Should, FR-009) — pure client-side, no server round-trip.
  const exportLabels = useMemo<ExportReportsLabels>(
    () => ({
      title: t("export.title"),
      statsHeading: t("export.statsHeading"),
      totalStudents: t("stats.totalStudents"),
      schoolAverage: t("stats.schoolAverage"),
      attendanceRate: t("stats.attendanceRate"),
      incidents: t("stats.incidents"),
      subjectsHeading: t("export.subjectsHeading"),
      subjectCol: t("export.subjectCol"),
      averageCol: t("export.averageCol"),
      attendanceHeading: t("export.attendanceHeading"),
      weekCol: t("export.weekCol"),
      rateCol: t("export.rateCol"),
      reportsHeading: t("export.reportsHeading"),
      nameCol: t("table.columns.name"),
      createdAtCol: t("table.columns.createdAt"),
      statusCol: t("table.columns.status"),
      statusReady: t("table.status.ready"),
      statusGenerating: t("table.status.generating"),
    }),
    [t],
  );
  const canExport =
    !!summaryQuery.data && !!subjectsQuery.data && !!attendanceQuery.data;
  const onExportExcel = useCallback(() => {
    if (!summaryQuery.data || !subjectsQuery.data || !attendanceQuery.data) {
      return;
    }
    try {
      downloadReportsCsv(
        {
          termLabel: t(`toolbar.termOptions.${termLabelKey(term)}`),
          summary: summaryQuery.data,
          subjects: subjectsQuery.data,
          weeks: attendanceQuery.data,
          reports: listQuery.data ?? [],
        },
        exportLabels,
        term,
      );
    } catch {
      toast.error(t("errors.unknown"));
    }
  }, [
    summaryQuery.data,
    subjectsQuery.data,
    attendanceQuery.data,
    listQuery.data,
    exportLabels,
    term,
    t,
  ]);

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-6 py-7 sm:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-foreground">
          {t("pageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("pageSubtitle")}</p>
      </header>

      <ReportsToolbar
        term={term}
        onTermChange={onTermChange}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
        onExportExcel={canExport ? onExportExcel : undefined}
      />

      <StatGridRegion
        status={
          summaryQuery.isLoading
            ? "loading"
            : summaryQuery.isError
              ? "error"
              : "success"
        }
        data={summaryQuery.data ?? null}
        errorKey={summaryQuery.isError ? errorKeyOf(summaryQuery.error) : null}
        onRetry={() => summaryQuery.refetch()}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SubjectAverageChartRegion
          status={listStatus(
            subjectsQuery.isLoading,
            subjectsQuery.isError,
            subjectsQuery.data?.length ?? 0,
          )}
          data={subjectsQuery.data ?? []}
          errorKey={
            subjectsQuery.isError ? errorKeyOf(subjectsQuery.error) : null
          }
          onRetry={() => subjectsQuery.refetch()}
        />
        <AttendanceTrendChartRegion
          status={listStatus(
            attendanceQuery.isLoading,
            attendanceQuery.isError,
            attendanceQuery.data?.length ?? 0,
          )}
          data={attendanceQuery.data ?? []}
          errorKey={
            attendanceQuery.isError ? errorKeyOf(attendanceQuery.error) : null
          }
          onRetry={() => attendanceQuery.refetch()}
        />
      </div>

      <PeriodicReportsTableRegion
        status={listStatus(
          listQuery.isLoading,
          listQuery.isError,
          listQuery.data?.length ?? 0,
        )}
        reports={listQuery.data ?? []}
        errorKey={listQuery.isError ? errorKeyOf(listQuery.error) : null}
        onRetry={() => listQuery.refetch()}
        onNewReport={() => generateMutation.mutate()}
        isGeneratingNewReport={generateMutation.isPending}
      />
    </div>
  );
}

function termLabelKey(term: Term): "hk1" | "hk2" | "fullYear" {
  switch (term) {
    case "HK1":
      return "hk1";
    case "HK2":
      return "hk2";
    default:
      return "fullYear";
  }
}
