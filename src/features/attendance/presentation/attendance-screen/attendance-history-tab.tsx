"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AttendanceDaySummary } from "../../domain/entities/attendance-day-summary.entity";
import { AttendanceHistoryDaySummaryRow } from "./attendance-history-day-summary-row";

type Props = {
  history: AttendanceDaySummary[];
  isLoading?: boolean;
  isError?: boolean;
};

export function AttendanceHistoryTab({
  history,
  isLoading = false,
  isError = false,
}: Props) {
  const t = useTranslations("attendance.history");

  if (isLoading) {
    return (
      <div className="rounded-[var(--edu-radius-card)] border border-border p-8 text-center text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-[var(--edu-radius-card)] border border-border p-8 text-center text-sm text-edu-error-text">
        {t("error")}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-[var(--edu-radius-card)] border border-border p-8 text-center text-sm text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">{t("date")}</TableHead>
            <TableHead>{t("summary")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((day) => (
            <AttendanceHistoryDaySummaryRow key={day.date} summary={day} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
