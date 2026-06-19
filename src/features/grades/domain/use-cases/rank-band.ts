export type RankBand = "xuat-sac" | "gioi" | "kha" | "trung-binh" | "yeu";

/**
 * Maps a weighted average (0–10 scale) to a TT22 rank band. A null average
 * (incomplete row) has no band.
 *   >= 9.5 → xuat-sac · >= 8.0 → gioi · >= 6.5 → kha ·
 *   >= 5.0 → trung-binh · < 5.0 → yeu
 */
export function getRankBand(avg: number | null): RankBand | null {
  if (avg === null) return null;
  if (avg >= 9.5) return "xuat-sac";
  if (avg >= 8.0) return "gioi";
  if (avg >= 6.5) return "kha";
  if (avg >= 5.0) return "trung-binh";
  return "yeu";
}

export const RANK_BANDS: RankBand[] = [
  "xuat-sac",
  "gioi",
  "kha",
  "trung-binh",
  "yeu",
];
