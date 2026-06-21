"use client";

import { AlertTriangle, CalendarX, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ConductSummaryEntity } from "../../../domain/entities/conduct-summary.entity";
import { conductColorVar } from "../../../domain/use-cases/conduct-color";
import {
  CONDUCT_GRADE_TONE,
  pointsColorClass,
} from "../../discipline-screen/discipline-tones";

export function ConductCard({ conduct }: { conduct: ConductSummaryEntity }) {
  const t = useTranslations("discipline.studentConduct.conductCard");
  const tGrade = useTranslations("discipline.conduct.grade");

  const { points, grade, violationCount, unexcusedAbsences } = conduct;
  const color = conductColorVar(points);
  const gradeLabel = tGrade(grade);

  return (
    <section
      className="rounded-[var(--edu-radius-card)] border border-border bg-card p-5 shadow-card sm:p-6"
      aria-labelledby="parent-conduct-heading"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2
          id="parent-conduct-heading"
          className="font-bold text-foreground text-sm"
        >
          {t("points")}
        </h2>
        {/* DR-GATE-001: text-muted-foreground (#8898A9) on bg-muted (#F5F7FA) = 2.75:1 — fails SC 1.4.3.
            text-edu-text-secondary (#5A6A85) on bg-muted = 5.10:1 — passes. */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-semibold text-[0.6875rem] text-edu-text-secondary">
          <Lock className="size-3" aria-hidden="true" />
          {t("readOnly")}
        </span>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
        {/* Score circle — 80×80, color/18 bg + 3px color/44 border. */}
        {/* A11Y-E09.4-008: aria-label format matches TR-NFR-002 — "Hạnh kiểm {grade}: {score} điểm".
            A11Y-E09.4-003: "/ 100" uses text-foreground (#2A3547) for sufficient contrast on
            the color-mix tinted background (was text-muted-foreground = 2.43:1 — FAIL). */}
        <div
          role="img"
          className="flex size-20 shrink-0 flex-col items-center justify-center rounded-full"
          style={{
            background: `color-mix(in srgb, ${color} 18%, transparent)`,
            border: `3px solid color-mix(in srgb, ${color} 44%, transparent)`,
          }}
          aria-label={t("scoreAriaLabel", { grade: gradeLabel, points })}
        >
          <span
            className="font-extrabold text-foreground leading-none tabular-nums"
            style={{ fontSize: 28 }}
          >
            {points}
          </span>
          <span className="text-[0.625rem] text-foreground opacity-60">
            / 100
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <StatusBadge tone={CONDUCT_GRADE_TONE[grade]} className="self-start">
            {gradeLabel}
          </StatusBadge>

          {/* Points progress bar (motion-safe). */}
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-edu-border"
            role="progressbar"
            aria-valuenow={points}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${t("points")}: ${points}/100`}
          >
            <div
              className={`h-full w-full origin-left rounded-full ${pointsColorClass(points)} motion-safe:transition-[transform] motion-safe:duration-500`}
              style={{
                transform: `scaleX(${Math.min(1, Math.max(0, points / 100))})`,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 rounded-[var(--edu-radius-card)] border border-border bg-background px-3 py-2.5">
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

            <div className="flex items-center gap-2.5 rounded-[var(--edu-radius-card)] border border-border bg-background px-3 py-2.5">
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
      </div>
    </section>
  );
}
