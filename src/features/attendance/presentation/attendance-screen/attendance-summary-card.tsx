"use client";

import { useTranslations } from "next-intl";
import { StatCard } from "@/components/shared/stat-card";
import type { AttendanceRecord } from "../../domain/entities/attendance-record.entity";

type Props = { records: AttendanceRecord[] };

export function AttendanceSummaryCard({ records }: Props) {
  const t = useTranslations("attendance.summary");
  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const absent = total - present;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
      <StatCard variant="compact" label={t("total")} value={String(total)} />
      <StatCard
        variant="compact"
        label={t("present")}
        value={String(present)}
        tone="success"
      />
      <StatCard
        variant="compact"
        label={t("absent")}
        value={String(absent)}
        tone="error"
      />
      <StatCard
        variant="compact"
        label={t("rate")}
        value={`${rate}%`}
        tone="primary"
      />
    </div>
  );
}
