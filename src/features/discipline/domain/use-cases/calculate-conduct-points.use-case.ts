import type { ConductGrade } from "../entities/conduct-summary.entity";
import type { ViolationSeverity } from "../entities/violation.entity";

const BASELINE = 100;

const SEVERITY_POINTS: Record<ViolationSeverity, number> = {
  low: -1,
  medium: -3,
  high: -5,
};

/** Conduct bands: Tot >= 90, Kha >= 70, TB >= 50, Yeu < 50. */
export function gradeForPoints(points: number): ConductGrade {
  if (points >= 90) return "excellent";
  if (points >= 70) return "good";
  if (points >= 50) return "average";
  return "poor";
}

export interface ConductPointsResult {
  points: number;
  grade: ConductGrade;
}

/**
 * Pure domain computation: conduct points start at 100 and are reduced by each
 * violation's severity weight, floored at 0. Grade derives from the band.
 */
export class CalculateConductPointsUseCase {
  execute(
    violations: ReadonlyArray<{ severity: ViolationSeverity }>,
  ): ConductPointsResult {
    const deduction = violations.reduce(
      (sum, v) => sum + SEVERITY_POINTS[v.severity],
      0,
    );
    const points = Math.max(0, BASELINE + deduction);
    return { points, grade: gradeForPoints(points) };
  }
}
