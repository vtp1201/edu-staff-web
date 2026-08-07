import type {
  GradeScaleBand,
  GradeScaleType,
} from "../entities/grade-scale.entity";
import {
  MAX_BAND_LABEL_LENGTH,
  MAX_NUMERIC_BANDS,
} from "../entities/grade-scale.entity";

export type GradeScaleValidationError =
  | "LOWEST_BAND_NOT_ZERO"
  | "OVERLAPPING_THRESHOLDS"
  | "GAPS_IN_COVERAGE"
  | "EMPTY_BANDS"
  | "TOO_MANY_BANDS"
  | "BAND_LABEL_REQUIRED"
  | "BAND_LABEL_TOO_LONG";

/**
 * Validate a set of grade-scale bands forms a continuous, non-overlapping
 * coverage of [0, maxScore]. Bands are defined by an inclusive `minThreshold`;
 * each band runs up to the next higher band's threshold (or `maxScore`).
 *
 * Since US-E18.49 (BE US-189) bands are PERSISTED on numeric scales, so this
 * also mirrors the BE's `422 GRADE_SCALE_INVALID_BANDS` rules client-side
 * (label 1..32 chars trimmed, at most 10 bands on a numeric scale, thresholds
 * strictly decreasing inside the range) — defense in depth, so an admin sees a
 * specific message instead of the single generic server code.
 *
 * Pure function — no React/HTTP. Returns the first error found, or null when valid.
 */
export function validateGradeScale(
  bands: GradeScaleBand[],
  maxScore: number,
  scaleType: GradeScaleType,
): GradeScaleValidationError | null {
  if (bands.length === 0) return "EMPTY_BANDS";

  // The 10-band cap applies to the numeric `bands` wire array only; a LETTER
  // scale is serialised as `letterGrades` (up to 64 entries).
  if (scaleType !== "LETTER" && bands.length > MAX_NUMERIC_BANDS) {
    return "TOO_MANY_BANDS";
  }

  for (const band of bands) {
    const label = band.label.trim();
    if (label.length === 0) return "BAND_LABEL_REQUIRED";
    if ([...label].length > MAX_BAND_LABEL_LENGTH) {
      return "BAND_LABEL_TOO_LONG";
    }
  }

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
