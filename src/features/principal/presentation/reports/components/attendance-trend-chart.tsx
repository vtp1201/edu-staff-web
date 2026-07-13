"use client";

import { useTranslations } from "next-intl";
import type { AttendanceTrendPointEntity } from "@/features/principal/domain/reports/entities/attendance-trend-point.entity";
import { cn } from "@/shared/utils";

export interface AttendanceTrendChartProps {
  weeks: AttendanceTrendPointEntity[];
  /** default 96 — INT-003/NFR-001 low-attendance threshold. A 2nd, more-severe
   *  band is an OPEN QUESTION (spec §8 item 5) — stays single-threshold until
   *  `ba-lead` confirms. */
  lowThreshold?: number;
}

/** Column height maps the 90–100% band to 0–100% of the track. */
function barHeight(rate: number): number {
  return Math.max(4, Math.min(100, ((rate - 90) / 10) * 100));
}

/**
 * Div-based column chart. Weeks with `rate < lowThreshold` are flagged by BOTH
 * bar-fill color (`bg-edu-warning`) AND label style (`font-extrabold
 * text-edu-warning-text`) — never color alone (NFR-001/AC-03.2; survives
 * color-simulated-removed because the weight differs too). `role="img"` +
 * computed `aria-label`; every value also a visible text label.
 */
export function AttendanceTrendChart({
  weeks,
  lowThreshold = 96,
}: AttendanceTrendChartProps) {
  const t = useTranslations("reports.charts.attendanceTrend");
  const rates = weeks.map((w) => w.rate);
  const lowest = rates.length ? Math.min(...rates) : 0;
  const highest = rates.length ? Math.max(...rates) : 0;
  return (
    <div className="rounded-[var(--edu-radius-card)] border border-border bg-card px-6 py-5 shadow-card">
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="text-[15px] font-extrabold text-foreground">
          {t("title")}
        </h3>
      </div>
      <div
        role="img"
        aria-label={t("ariaLabel", {
          count: weeks.length,
          lowest: lowest.toLocaleString("vi-VN"),
          highest: highest.toLocaleString("vi-VN"),
        })}
        className="flex h-[180px] items-end gap-3"
      >
        {weeks.map((w) => {
          const low = w.rate < lowThreshold;
          return (
            <div
              key={w.weekLabel}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              <span
                className={cn(
                  "text-[10.5px] tabular-nums",
                  low
                    ? "font-extrabold text-edu-warning-text"
                    : "font-semibold text-edu-text-secondary",
                )}
              >
                {w.rate.toLocaleString("vi-VN")}%
              </span>
              <div
                className={cn(
                  "w-full max-w-[30px] rounded-t-md border",
                  low
                    ? "border-edu-warning-text bg-edu-warning"
                    : "border-edu-success-text bg-edu-success",
                )}
                style={{ height: `${barHeight(w.rate)}%` }}
              />
              <span className="text-[10.5px] font-semibold text-muted-foreground">
                {w.weekLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
