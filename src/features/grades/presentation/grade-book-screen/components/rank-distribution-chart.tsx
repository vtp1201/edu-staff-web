"use client";

import { useTranslations } from "next-intl";
import type { GradeBookRow } from "@/features/grades/domain/entities/grade-book.entity";
import type { RankBand } from "@/features/grades/domain/use-cases/rank-band";
import { calculateRankDistribution } from "@/features/grades/domain/use-cases/rank-distribution";
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

export function RankDistributionChart({ rows }: { rows: GradeBookRow[] }) {
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
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", BAND_FILL[band.band])}
                style={{ width: `${band.percentage}%` }}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
              {band.count} ({band.percentage}%)
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
