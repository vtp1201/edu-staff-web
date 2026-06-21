/**
 * Domain rule (US-E09.4, TR-017): map a conduct score (0–100) to the CSS
 * variable string used by the presentation score circle. Lives in the domain so
 * the score→color mapping is not duplicated in presentation.
 */
export function conductColorVar(points: number): string {
  if (points >= 90) return "var(--edu-success)";
  if (points >= 70) return "var(--edu-primary)";
  if (points >= 50) return "var(--edu-warning)";
  return "var(--edu-error)";
}
