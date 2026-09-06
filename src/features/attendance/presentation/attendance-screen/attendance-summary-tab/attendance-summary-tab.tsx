"use client";

import { AlertTriangle, FileText, Percent, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { ListError } from "@/components/shared/list-error";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { StatCard, type StatTone } from "@/components/shared/stat-card";
import { StatCardSkeletonGrid } from "@/components/shared/stat-card-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClassAttendanceSummary } from "../../../domain/entities/student-attendance-summary.entity";
import { AlertsPanel } from "./alerts-panel";
import type {
  AttendanceSummaryVM,
  SummaryControlsVM,
  SummaryNotice,
} from "./attendance-summary-tab.i-vm";
import { SummaryControls } from "./summary-controls";
import { SummaryTable } from "./summary-table";
import { ThresholdsCard } from "./thresholds-card";

export type AttendanceSummaryTabProps = {
  vm: AttendanceSummaryVM;
  controls: SummaryControlsVM;
  /** `YYYY-MM` ceiling for the month input (a future month has no data). */
  maxMonth: string;
  notice: SummaryNotice | null;
  onControlsChange: (next: Partial<SummaryControlsVM>) => void;
  onRetry: () => void;
};

/**
 * "Tổng hợp chuyên cần" — tab 3 of `/teacher/attendance` (US-E24.14).
 *
 * Presentational: every number arrives already computed by
 * `summarizeClassAttendance` and every string is translated here, never on the
 * server. The controls render in EVERY state so a teacher who lands on an
 * empty month or a 403 can still pick another range.
 */
export function AttendanceSummaryTab({
  vm,
  controls,
  maxMonth,
  notice,
  onControlsChange,
  onRetry,
}: AttendanceSummaryTabProps) {
  const t = useTranslations("attendance.summaryTab");
  const tErrors = useTranslations("attendance.errors");

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="p-4 sm:p-5">
          <SummaryControls
            value={controls}
            maxMonth={maxMonth}
            onChange={onControlsChange}
          />
        </CardContent>
      </Card>

      {notice && (
        <p
          role="status"
          className="rounded-[var(--edu-radius-card)] border border-border bg-muted px-4 py-3 text-foreground text-sm"
        >
          {t(notice === "no-terms" ? "noTerms" : "rangeTooLarge")}
        </p>
      )}

      {vm.status === "loading" && (
        <div className="flex flex-col gap-5">
          {/* Exactly ONE live region for the whole tab: the list skeleton
              below owns it, so the load is announced once, not twice
              (A11Y-001 / WCAG 4.1.3). */}
          <StatCardSkeletonGrid
            count={4}
            srLabel={t("loading")}
            announce={false}
          />
          <ListSkeleton
            variant="inline"
            rows={6}
            loadingAriaLabel={t("loading")}
            renderRow={() => (
              <div className="flex items-center gap-3 px-5 py-3">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <Skeleton className="h-3 w-40" />
                <Skeleton className="ml-auto h-3 w-24" />
              </div>
            )}
          />
        </div>
      )}

      {vm.status === "error" && (
        <ListError
          shape="inline-card"
          iconSize={10}
          retryIcon="rotate"
          title={t("errorTitle")}
          description={
            vm.errorKey === "forbidden"
              ? tErrors("forbidden")
              : t("errorDescription")
          }
          onRetry={onRetry}
          retryLabel={t("retry")}
          // A 403 is terminal for this teacher: a retry button would only
          // promise a second identical refusal (same posture as the other
          // forbidden-class screens).
          showRetry={vm.errorKey !== "forbidden"}
        />
      )}

      {vm.status === "empty" && (
        <div className="rounded-[var(--edu-radius-card)] border border-border p-8 text-center text-muted-foreground text-sm">
          {t("empty")}
        </div>
      )}

      {vm.status === "ready" && (
        <>
          <SummaryStats summary={vm.summary} />
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <SummaryTable
              // Remounts on a range change, which resets the client-side sort.
              key={`${vm.range.startDate}:${vm.range.endDate}`}
              students={vm.summary.students}
              range={vm.range}
            />
            <div className="flex flex-col gap-4">
              <AlertsPanel students={vm.summary.students} />
              <ThresholdsCard />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Mean-rate tone mirrors the student bands: ≥95 success, ≥90 warning, else
 *  error. `null` (nobody has a record) is `muted` — not a red 0%. */
function meanTone(meanRate: number | null): StatTone {
  if (meanRate === null) return "muted";
  if (meanRate >= 95) return "success";
  if (meanRate >= 90) return "warning";
  return "error";
}

function SummaryStats({ summary }: { summary: ClassAttendanceSummary }) {
  const t = useTranslations("attendance.summaryTab");
  const totalExcused = summary.students.reduce((sum, s) => sum + s.excused, 0);
  const totalAbsent = summary.students.reduce((sum, s) => sum + s.absent, 0);
  const belowThreshold = summary.students.filter(
    (s) => s.band === "risk",
  ).length;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        denseOnMobile
        label={t("meanRate")}
        value={
          summary.meanRate === null ? (
            <>
              <span aria-hidden="true">—</span>
              <span className="sr-only">{t("noRate")}</span>
            </>
          ) : (
            `${summary.meanRate}%`
          )
        }
        icon={Percent}
        tone={meanTone(summary.meanRate)}
      />
      <StatCard
        denseOnMobile
        label={t("totalExcused")}
        value={String(totalExcused)}
        icon={FileText}
        tone="warning"
      />
      <StatCard
        denseOnMobile
        label={t("totalAbsent")}
        value={String(totalAbsent)}
        icon={AlertTriangle}
        tone="error"
      />
      <StatCard
        denseOnMobile
        label={t("belowThreshold")}
        value={String(belowThreshold)}
        icon={Users}
        tone={belowThreshold > 0 ? "error" : "success"}
      />
    </div>
  );
}
