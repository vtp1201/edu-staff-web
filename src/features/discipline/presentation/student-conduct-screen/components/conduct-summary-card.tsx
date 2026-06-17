"use client";

import { AlertTriangle, CalendarX, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/shared/utils";
import type { ConductSummaryEntity } from "../../../domain/entities/conduct-summary.entity";
import {
  CONDUCT_GRADE_TONE,
  pointsColorClass,
} from "../../discipline-screen/discipline-tones";

export function ConductSummaryCard({
  conductSummary,
}: {
  conductSummary: ConductSummaryEntity;
}) {
  const t = useTranslations("discipline.studentConduct.conductCard");
  const tGrade = useTranslations("discipline.conduct.grade");

  const { points, grade, violationCount, unexcusedAbsences } = conductSummary;

  return (
    <section
      className="rounded-[var(--edu-radius-card)] border border-border bg-card p-5 shadow-card sm:p-6"
      aria-labelledby="conduct-summary-heading"
    >
      <h2 id="conduct-summary-heading" className="sr-only">
        {t("points")}
      </h2>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-3">
          <span
            className={cn(
              "font-extrabold text-[2.75rem] leading-none tabular-nums",
              points >= 90
                ? "text-edu-success-text"
                : points >= 70
                  ? "text-primary"
                  : points >= 50
                    ? "text-edu-warning-foreground"
                    : "text-edu-error-text",
            )}
          >
            {points}
          </span>
          <div className="flex flex-col gap-1">
            <span className="font-bold text-[0.6875rem] text-[color:var(--edu-text-secondary)] uppercase tracking-wide">
              {t("points")}
            </span>
            <StatusBadge tone={CONDUCT_GRADE_TONE[grade]}>
              {tGrade(grade)}
            </StatusBadge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 rounded-[var(--edu-radius-card)] border border-border bg-background px-3.5 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-edu-warning/15">
              <AlertTriangle
                className="size-4 text-edu-warning-foreground"
                aria-hidden="true"
              />
            </span>
            <div className="flex flex-col">
              <span className="font-extrabold text-foreground text-lg tabular-nums">
                {violationCount}
              </span>
              <span className="text-[color:var(--edu-text-secondary)] text-xs">
                {t("violations")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-[var(--edu-radius-card)] border border-border bg-background px-3.5 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-edu-error/15">
              <CalendarX
                className="size-4 text-edu-error-text"
                aria-hidden="true"
              />
            </span>
            <div className="flex flex-col">
              <span className="font-extrabold text-foreground text-lg tabular-nums">
                {unexcusedAbsences}
              </span>
              <span className="text-[color:var(--edu-text-secondary)] text-xs">
                {t("absences")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Points progress bar (track + fill, motion-safe via transition class). */}
      <div className="mt-5 flex items-center gap-2">
        <Star className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-edu-border"
          role="progressbar"
          aria-valuenow={points}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${t("points")}: ${points}/100`}
        >
          <div
            className={cn(
              "h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500",
              pointsColorClass(points),
            )}
            style={{ width: `${Math.min(100, Math.max(0, points))}%` }}
          />
        </div>
      </div>
    </section>
  );
}
