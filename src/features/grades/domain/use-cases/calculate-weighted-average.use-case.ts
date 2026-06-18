import type { AssessmentColumn } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";

/**
 * Weighted average = sum(score × weight) / sum(weights), rounded to 1 decimal.
 * Returns null if ANY column score is missing (null or absent) — an incomplete
 * row has no meaningful average.
 */
export function calculateWeightedAverage(
  scores: Record<string, number | null>,
  columns: AssessmentColumn[],
): number | null {
  if (columns.length === 0) return null;

  let weightedSum = 0;
  let weightTotal = 0;

  for (const col of columns) {
    const score = scores[col.id];
    if (score === null || score === undefined) {
      return null;
    }
    weightedSum += score * col.weight;
    weightTotal += col.weight;
  }

  if (weightTotal === 0) return null;

  const avg = weightedSum / weightTotal;
  return Math.round(avg * 10) / 10;
}
