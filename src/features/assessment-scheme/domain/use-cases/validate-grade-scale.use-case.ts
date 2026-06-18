import type { GradeScaleBand } from "../entities/grade-scale.entity";

export type GradeScaleValidationError =
  | "LOWEST_BAND_NOT_ZERO"
  | "OVERLAPPING_THRESHOLDS"
  | "GAPS_IN_COVERAGE"
  | "EMPTY_BANDS";

/**
 * Validate a set of grade-scale bands forms a continuous, non-overlapping
 * coverage of [0, maxScore]. Bands are defined by an inclusive `minThreshold`;
 * each band runs up to the next higher band's threshold (or `maxScore`).
 *
 * Pure function — no React/HTTP. Returns the first error found, or null when valid.
 */
export function validateGradeScale(
  bands: GradeScaleBand[],
  maxScore: number,
): GradeScaleValidationError | null {
  if (bands.length === 0) return "EMPTY_BANDS";

  // Sort ascending by threshold (copy — do not mutate input).
  const sorted = [...bands].sort((a, b) => a.minThreshold - b.minThreshold);

  // Lowest band must start at 0.
  if (sorted[0].minThreshold !== 0) return "LOWEST_BAND_NOT_ZERO";

  // No two bands may share a threshold (overlap) and each must sit below maxScore.
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].minThreshold === sorted[i - 1].minThreshold) {
      return "OVERLAPPING_THRESHOLDS";
    }
    if (sorted[i].minThreshold >= maxScore) {
      return "GAPS_IN_COVERAGE";
    }
  }

  return null;
}
