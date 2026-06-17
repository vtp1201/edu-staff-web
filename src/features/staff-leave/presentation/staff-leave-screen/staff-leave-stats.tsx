"use client";

import { CalendarDays, CheckCircle2, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatCard } from "@/components/shared/stat-card";

export interface StaffLeaveStatsProps {
  pending: number;
  approvedThisMonth: number;
  totalDaysThisMonth: number;
}

/** The 3 summary stat cards atop the staff-leave screen. */
export function StaffLeaveStats({
  pending,
  approvedThisMonth,
  totalDaysThisMonth,
}: StaffLeaveStatsProps) {
  const t = useTranslations("staffLeave.stats");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        icon={Clock}
        tone="warning"
        label={t("pending")}
        value={String(pending)}
      />
      <StatCard
        icon={CheckCircle2}
        tone="success"
        label={t("approvedThisMonth")}
        value={String(approvedThisMonth)}
      />
      <StatCard
        icon={CalendarDays}
        tone="info"
        label={t("totalDays")}
        value={String(totalDaysThisMonth)}
      />
    </div>
  );
}
