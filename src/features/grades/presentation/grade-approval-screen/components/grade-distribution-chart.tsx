"use client";

import { useTranslations } from "next-intl";
import type { GradeBandKey } from "@/features/grades/domain/entities/grade-approval-batch.entity";

type Band = { key: GradeBandKey; count: number };

/** Token tones per performance band (highest → lowest). */
const TONE: Record<GradeBandKey, string> = {
  excellent: "bg-edu-success",
  good: "bg-edu-primary",
  average: "bg-edu-warning",
  weak: "bg-edu-error",
  poor: "bg-edu-error-dark",
};

/** Stable band key → i18n label key under `gradeApproval`. */
const BAND_LABEL_KEY: Record<
  GradeBandKey,
  "bandExcellent" | "bandGood" | "bandAverage" | "bandWeak" | "bandPoor"
> = {
  excellent: "bandExcellent",
  good: "bandGood",
  average: "bandAverage",
  weak: "bandWeak",
  poor: "bandPoor",
};

/**
 * DR-009 US-E16.4 — progress fill uses GPU-composited `scaleX` (transform)
 * instead of animating `width`, which triggers layout/paint each frame. The
 * fill is full-width with `origin-left`; the ratio scales it horizontally.
 */
export function fillTransform(ratio: number): string {
  return `scaleX(${Math.min(1, Math.max(0, ratio))})`;
}

export function GradeDistributionChart({
  distribution,
}: {
  distribution: Band[];
}) {
  const t = useTranslations("gradeApproval");
  const tSheet = useTranslations("gradeApproval.detailSheet");
  const max = Math.max(1, ...distribution.map((b) => b.count));
  return (
    <ul className="flex flex-col gap-2" aria-label={tSheet("distribution")}>
      {distribution.map((band) => (
        <li key={band.key} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-edu-text-secondary">
            {t(BAND_LABEL_KEY[band.key])}
          </span>
          <div
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-edu-border"
            role="progressbar"
            aria-valuenow={Math.round((band.count / max) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("bandProgressLabel", {
              band: t(BAND_LABEL_KEY[band.key]),
            })}
          >
            <div
              className={`h-full w-full origin-left rounded-full motion-safe:transition-[transform] motion-safe:duration-500 ${TONE[band.key]}`}
              style={{ transform: fillTransform(band.count / max) }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs font-semibold text-foreground">
            {band.count}
          </span>
        </li>
      ))}
    </ul>
  );
}
