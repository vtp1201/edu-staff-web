"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";
import type { AttendanceBand } from "../../../domain/entities/student-attendance-summary.entity";
import { BAND_DOT_CLASS } from "./summary-bands";

const BANDS: AttendanceBand[] = ["ok", "watch", "risk"];

/**
 * Static legend for the three threshold bands. No data dependency on purpose —
 * it explains what the chips MEAN, so it must read the same on an empty range
 * as on a full one.
 *
 * The coloured dot is `aria-hidden`; the band name next to it carries the
 * meaning, so the legend is not colour-only (`accessibility.md` §Contrast).
 */
export function ThresholdsCard() {
  const t = useTranslations("attendance.summaryTab");

  return (
    <section
      aria-labelledby="att-summary-thresholds-title"
      className="rounded-[var(--edu-radius-card)] border border-primary/20 bg-primary/5 px-4 py-3"
    >
      <h3
        id="att-summary-thresholds-title"
        className="mb-1.5 font-bold text-[11px] text-primary uppercase tracking-wide"
      >
        {t("thresholdsTitle")}
      </h3>
      <dl className="space-y-1">
        {BANDS.map((band) => (
          <div key={band} className="flex items-center justify-between gap-3">
            <dt className="inline-flex items-center gap-1.5 text-muted-foreground text-xs">
              <span
                aria-hidden="true"
                className={cn("size-2 rounded-full", BAND_DOT_CLASS[band])}
              />
              {t(`bands.${band}` as `bands.${AttendanceBand}`)}
            </dt>
            <dd className="font-bold text-foreground text-xs tabular-nums">
              {t(`thresholds.${band}` as `thresholds.${AttendanceBand}`)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
