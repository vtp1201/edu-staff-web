"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { TableCell, TableRow } from "@/components/ui/table";
import type { AttendanceDaySummary } from "../../domain/entities/attendance-day-summary.entity";

/**
 * One row per day for the history tab — date + 4 status-count chips
 * (present/late/excusedAbsent/absent). Composed of `Table` row + `StatusBadge`
 * (reused, not reinvented). Feature-local: exactly one screen uses this today
 * (`component-organization.md` decision tree item 3) — promote to
 * `components/shared/` only if a second screen needs a day-summary row.
 */
export function AttendanceHistoryDaySummaryRow({
  summary,
}: {
  summary: AttendanceDaySummary;
}) {
  const t = useTranslations("attendance.status");

  return (
    <TableRow>
      <TableCell className="font-medium">{summary.date}</TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone="success">
            {t("present")} {summary.counts.present}
          </StatusBadge>
          <StatusBadge tone="info">
            {t("late")} {summary.counts.late}
          </StatusBadge>
          <StatusBadge tone="warning">
            {t("excusedAbsent")} {summary.counts.excusedAbsent}
          </StatusBadge>
          <StatusBadge tone="error">
            {t("absent")} {summary.counts.absent}
          </StatusBadge>
        </div>
      </TableCell>
    </TableRow>
  );
}
