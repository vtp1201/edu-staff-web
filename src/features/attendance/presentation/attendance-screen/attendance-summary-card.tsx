"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import type { AttendanceRecord } from "../../domain/entities/attendance-record.entity";

type Props = { records: AttendanceRecord[] };

export function AttendanceSummaryCard({ records }: Props) {
  const t = useTranslations("attendance.summary");
  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const absent = total - present;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label={t("total")} value={total} />
      <Stat label={t("present")} value={present} tone="success" />
      <Stat label={t("absent")} value={absent} tone="error" />
      <Stat label={t("rate")} value={`${rate}%`} tone="primary" />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: number | string;
  tone?: "muted" | "success" | "error" | "primary";
}) {
  const toneClass =
    tone === "success"
      ? "text-edu-success"
      : tone === "error"
        ? "text-edu-error"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
