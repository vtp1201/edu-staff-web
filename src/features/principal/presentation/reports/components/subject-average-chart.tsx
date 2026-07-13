"use client";

import { useTranslations } from "next-intl";
import type { SubjectAverageEntity } from "@/features/principal/domain/reports/entities/subject-average.entity";

export interface SubjectAverageChartProps {
  subjects: SubjectAverageEntity[];
  /** default 10 — "Thang điểm 10". */
  maxScore?: number;
}

/**
 * Div-based bar chart (no chart lib, plan.md D-2). `role="img"` + computed
 * `aria-label`; every bar carries a visible numeric label (FR-005/NFR-001 —
 * never chart-only). Tokens-only fill (`bg-primary`).
 */
export function SubjectAverageChart({
  subjects,
  maxScore = 10,
}: SubjectAverageChartProps) {
  const t = useTranslations("reports.charts.subjectAverage");
  const averages = subjects.map((s) => s.average);
  const min = averages.length ? Math.min(...averages) : 0;
  const max = averages.length ? Math.max(...averages) : 0;
  return (
    <div className="rounded-[var(--edu-radius-card)] border border-border bg-card px-6 py-5 shadow-card">
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="text-[15px] font-extrabold text-foreground">
          {t("title")}
        </h3>
        <span className="text-[11px] text-muted-foreground">{t("scale")}</span>
      </div>
      <div
        role="img"
        aria-label={t("ariaLabel", {
          count: subjects.length,
          min: min.toFixed(1),
          max: max.toFixed(1),
        })}
        className="flex h-[180px] items-end gap-3"
      >
        {subjects.map((s) => (
          <div
            key={s.subjectId}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
          >
            <span className="text-[11px] font-bold text-edu-text-secondary tabular-nums">
              {s.average.toFixed(1)}
            </span>
            <div
              className="w-full max-w-[34px] rounded-t-md bg-primary"
              style={{
                height: `${(Math.min(s.average, maxScore) / maxScore) * 100}%`,
              }}
            />
            <span className="w-full truncate text-center text-[10.5px] font-semibold text-muted-foreground">
              {s.subjectName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
