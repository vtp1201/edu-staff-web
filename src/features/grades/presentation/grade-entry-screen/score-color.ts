/**
 * Score → color class, proportional to the scale so SCALE_10 and SCALE_4 share
 * one rule (design-system §Score / performance):
 *   ≥ 80% of maxScore → success text  (8/10, 3.2/4)
 *   < 50% of maxScore → error text    (<5/10, <2/4)
 *   otherwise          → neutral foreground
 */
export function getScoreColorClass(
  score: number | null,
  maxScore: number,
): string {
  if (score === null || maxScore <= 0) return "text-foreground";
  const ratio = score / maxScore;
  if (ratio >= 0.8) return "text-edu-success-text";
  if (ratio < 0.5) return "text-edu-error-text";
  return "text-foreground";
}
