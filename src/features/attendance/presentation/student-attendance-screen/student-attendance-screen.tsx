"use client";

import { ShieldAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { AttendanceSummaryBlock } from "@/components/shared/attendance-summary";
import { EmptyState } from "@/components/shared/empty-state";
import { ListError } from "@/components/shared/list-error";
import { isRetryableFailure } from "@/features/parent-attendance/presentation/parent-attendance-screen/build-parent-attendance-vm";
import { parseIsoDate } from "@/shared/parse-iso-date";
import type { StudentAttendanceScreenVM } from "./student-attendance-screen.i-vm";

const DATE_FORMAT = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
} as const;

export interface StudentAttendanceScreenProps {
  vm: StudentAttendanceScreenVM;
  onRetry?: () => void;
}

/**
 * "Chuyên cần của tôi" — a student's own attendance summary (US-E24.6).
 *
 * VOCABULARY DEVIATION (packet, recorded in design-spec): the mockup counts
 * *tiết* (periods). Core records attendance per DAY, so every label here says
 * *buổi/ngày*. Nothing invents a period breakdown that has no source.
 *
 * There is deliberately NO "xin phép nghỉ" button on this screen: a student's
 * own requests live on `/student/conduct` (design), and adding a second entry
 * point would fork the flow.
 */
export function StudentAttendanceScreen({
  vm,
  onRetry,
}: StudentAttendanceScreenProps) {
  const t = useTranslations("studentAttendance");
  const format = useFormatter();

  if (vm.status === "forbidden") {
    return (
      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <Header title={t("title")} subtitle={t("subtitle")} />
        <EmptyState
          icon={ShieldAlert}
          title={t("forbiddenTitle")}
          body={t("forbiddenBody")}
        />
      </div>
    );
  }

  const start = parseIsoDate(vm.range.startDate);
  const end = parseIsoDate(vm.range.endDate);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-5">
      <Header title={t("title")} subtitle={t("subtitle")} />

      {/* The applied range is always visible: it may be the current term or the
          six-month fallback (the calendar read is admin-scoped and may 403), and
          an unexplained denominator is worse than a longer subtitle. */}
      <p className="text-muted-foreground text-xs">
        {t("rangeNotice", {
          startDate: start
            ? format.dateTime(start, DATE_FORMAT)
            : vm.range.startDate,
          endDate: end ? format.dateTime(end, DATE_FORMAT) : vm.range.endDate,
        })}
      </p>

      {vm.status === "error" ? (
        <ListError
          message={t(`errors.${vm.errorKey}`)}
          retryLabel={t("retry")}
          shape="inline-card"
          iconSize={10}
          retryIcon="rotate"
          showRetry={isRetryableFailure(vm.errorKey)}
          onRetry={() => onRetry?.()}
        />
      ) : (
        <AttendanceSummaryBlock
          summary={vm.summary}
          months={vm.months}
          history={vm.history}
        />
      )}
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="font-extrabold text-2xl text-foreground">{title}</h1>
      <p className="text-edu-text-secondary text-sm">{subtitle}</p>
    </header>
  );
}
