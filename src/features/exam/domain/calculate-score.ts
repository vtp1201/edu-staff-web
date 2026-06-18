/** correct/total * 10, rounded to 1 decimal. */
export function calculateScore(
  correctCount: number,
  totalQuestions: number,
): number {
  if (totalQuestions === 0) return 0;
  return Math.round((correctCount / totalQuestions) * 100) / 10;
}

/**
 * Score → text-color token class per design-system.md:
 * >=8 success, >=5 primary, <5 error. Returns a token class only — never raw color.
 */
export function scoreColorClass(score: number): string {
  if (score >= 8) return "text-edu-success-text";
  if (score >= 5) return "text-primary";
  return "text-edu-error-text";
}
