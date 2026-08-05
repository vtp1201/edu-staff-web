"use client";

import { useTranslations } from "next-intl";
import type { RankBand } from "@/features/grades/domain/use-cases/rank-band";
import {
  calculateRankDistribution,
  type RankedRow,
} from "@/features/grades/domain/use-cases/rank-distribution";
import { cn } from "@/shared/utils";

/** Bar fill per band (token-only). */
const BAND_FILL: Record<RankBand, string> = {
  "xuat-sac": "bg-edu-success",
  gioi: "bg-primary",
  kha: "bg-edu-warning",
  "trung-binh": "bg-muted-foreground",
  yeu: "bg-edu-error",
};

type RankLabelKey =
  | "rankXuatSac"
  | "rankGioi"
  | "rankKha"
  | "rankTrungBinh"
  | "rankYeu";

const BAND_LABEL: Record<RankBand, RankLabelKey> = {
  "xuat-sac": "rankXuatSac",
  gioi: "rankGioi",
  kha: "rankKha",
  "trung-binh": "rankTrungBinh",
  yeu: "rankYeu",
};

/**
 * Five-band rank distribution (US-E13.6 AC). Canonical home is this
 * feature-level `presentation/components/` folder because TWO grades screens
 * render it (US-E18.44): the read-only `GradeBookScreen` (teacher/student/
 * parent) and the staff `GradeEntryScreen` (teacher entry + principal/admin
 * approver). It takes the structural {@link RankedRow} so both read shapes
 * (`GradeBookRow` and `StudentScoreRow`) work with one component — moved, not
 * copied (decision 0026).
 */
export function RankDistributionChart({
  rows,
}: {
  rows: readonly RankedRow[];
}) {
  const t = useTranslations("gradeBook");
  const distribution = calculateRankDistribution(rows);

  return (
    <section
      aria-label={t("rankDistributionTitle")}
      className="flex flex-col gap-3 rounded-[12px] border border-border bg-card p-5 shadow-card"
    >
      <h2 className="font-bold text-card-foreground text-sm">
        {t("rankDistributionTitle")}
      </h2>
      <ul className="flex flex-col gap-2.5">
        {distribution.bands.map((band) => (
          <li key={band.band} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-foreground text-xs">
              {t(BAND_LABEL[band.band])}
            </span>
            <div
              aria-hidden="true"
              className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted"
            >
              <div
                className={cn("h-full rounded-full", BAND_FILL[band.band])}
                style={{ width: `${band.percentage}%` }}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-edu-text-secondary text-xs tabular-nums">
              {band.count} ({band.percentage}%)
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
