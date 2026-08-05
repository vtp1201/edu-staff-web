import { getRankBand, RANK_BANDS, type RankBand } from "./rank-band";

/**
 * The only field this calculation reads (US-E18.44). Declared structurally so
 * BOTH grade read shapes satisfy it — the read-only multi-role `GradeBookRow`
 * AND the staff-side `StudentScoreRow` (`GradeSheet`, which additionally
 * carries per-cell rejections). Deliberately NOT typed as `GradeBookRow`: the
 * principal/admin grade view moved onto the staff read shape so it can host the
 * reject affordance, and the distribution must stay ONE implementation rather
 * than being copied per shape.
 */
export interface RankedRow {
  /** weighted average; null = not fully graded (excluded from band counts) */
  average: number | null;
}

export interface RankBandCount {
  band: RankBand;
  count: number;
  /** percentage of GRADED rows (rows with a non-null average), 0–100, 1 dp */
  percentage: number;
}

export interface RankDistribution {
  bands: RankBandCount[];
  /** number of rows with a non-null average (denominator for percentages) */
  graded: number;
  /** total rows considered (including incomplete) */
  total: number;
}

/**
 * Counts rows per rank band + percentage of GRADED rows in each band. Rows with
 * a null average are excluded from the band counts but reflected in `total`.
 */
export function calculateRankDistribution(
  rows: readonly RankedRow[],
): RankDistribution {
  const counts = new Map<RankBand, number>();
  for (const band of RANK_BANDS) counts.set(band, 0);

  let graded = 0;
  for (const row of rows) {
    const band = getRankBand(row.average);
    if (band === null) continue;
    graded += 1;
    counts.set(band, (counts.get(band) ?? 0) + 1);
  }

  const bands: RankBandCount[] = RANK_BANDS.map((band) => {
    const count = counts.get(band) ?? 0;
    const percentage =
      graded === 0 ? 0 : Math.round((count / graded) * 1000) / 10;
    return { band, count, percentage };
  });

  return { bands, graded, total: rows.length };
}
