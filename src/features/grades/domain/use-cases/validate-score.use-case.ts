import type { GradesFailure } from "../failures/grades.failure";

export type ValidateScoreResult =
  | { valid: true }
  | { valid: false; failure: GradesFailure };

/**
 * A score is valid when 0 <= value <= maxScore (inclusive). 1-decimal
 * precision is accepted. `columnId` is threaded into the failure so the UI can
 * mark the offending cell.
 */
export function validateScore(
  value: number,
  maxScore: number,
  columnId = "",
): ValidateScoreResult {
  if (Number.isNaN(value) || value < 0 || value > maxScore) {
    return {
      valid: false,
      failure: { type: "score-out-of-range", columnId, maxScore },
    };
  }
  return { valid: true };
}
