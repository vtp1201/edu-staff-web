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

  // A11Y-103: the wrapper persists across loading/error/data so a
  // screen-reader announces the state TRANSITION on tab-switch fetch — not
  // just a one-off message inside a div that's swapped out and back in.
  return (
    <div role="status" aria-live="polite">
      {isLoading ? (
        <div className="rounded-[var(--edu-radius-card)] border border-border p-8 text-center text-sm text-muted-foreground">
          {t("loading")}
        </div>
      ) : isError ? (
        <div className="rounded-[var(--edu-radius-card)] border border-border p-8 text-center text-sm text-edu-error-text">
          {t("error")}
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-[var(--edu-radius-card)] border border-border p-8 text-center text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
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
      )}
    </div>
  );
}
