import type { SubjectColumnScore } from "../entities/academic-record.entity";

/**
 * Coefficient-weighted average of ONE subject's frozen snapshot columns
 * (US-E18.54). The real `gradeSnapshot` is a DYNAMIC column array — each item
 * carries its own `coefficient` — so the old fixed `tx1×1/tx2×1/giuaKy×2/
 * cuoiKy×3` formula (a shape that never existed on the wire) is gone.
 *
 * - a column with a `null` value does not contribute to either side of the
 *   ratio (a seal snapshot can be partial; an absent score is not a zero);
 * - a `null` coefficient counts as weight 1 — dropping the column would
 *   silently hide a real score;
 * - `null` when no column contributes or the total weight is 0.
 *
 * Rounded to 2 decimals (unchanged from the pre-remodel viewer, which is a
 * finer grain than the teacher gradebook's 1 decimal on purpose: this is the
 * archival học-bạ view).
 */
export function calculateSubjectAvg(
  columns: SubjectColumnScore[],
): number | null {
  let weightedSum = 0;
  let weightTotal = 0;

  for (const column of columns) {
    if (column.value === null) continue;
    const weight = column.coefficient ?? 1;
    weightedSum += column.value * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) return null;
  return Math.round((weightedSum / weightTotal) * 100) / 100;
}
