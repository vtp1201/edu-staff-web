import type { AssessmentColumn } from "../entities/assessment-scheme.entity";

export type SchemeValidationError =
  | "EMPTY_COLUMNS"
  | "WEIGHT_SUM_NOT_100"
  | "INVALID_COUNT";

/**
 * Validate an assessment scheme: at least one column, each count >= 1, and the
 * sum of weights equals 100 (with a small tolerance for float rounding).
 *
 * Pure function — no React/HTTP. Returns the first error found, or null when valid.
 */
export function validateAssessmentScheme(
  columns: AssessmentColumn[],
): SchemeValidationError | null {
  if (columns.length === 0) return "EMPTY_COLUMNS";

  for (const col of columns) {
    if (!Number.isFinite(col.count) || col.count < 1) {
      return "INVALID_COUNT";
    }
  }

  const sum = columns.reduce((acc, col) => acc + col.weight, 0);
  // Tolerate float rounding (e.g. 33.33 * 2 + 33.34).
  if (Math.abs(sum - 100) > 0.01) {
    return "WEIGHT_SUM_NOT_100";
  }

  return null;
}
