import type { ExamQuestion } from "./entities/exam-question.entity";

/** correct/total * 10, rounded to 1 decimal. */
export function calculateScore(
  correctCount: number,
  totalQuestions: number,
): number {
  if (totalQuestions === 0) return 0;
  return Math.round((correctCount / totalQuestions) * 100) / 10;
}

export interface PartialScoreResult {
  mcqCorrect: number;
  mcqTotal: number;
  mcqScore: number;
}

/** Minimal answer shape the partial-score calculation needs (pure domain). */
type PartialAnswer = { selectedOptionId?: string | null };

/**
 * MCQ-only partial score for a mixed exam (essay graded later by a teacher).
 * Counts an MCQ question as "answered" when an option was selected.
 */
export function calculatePartialScore(
  questions: ExamQuestion[],
  answers: Record<string, PartialAnswer>,
): PartialScoreResult {
  const mcqQuestions = questions.filter((q) => (q.type ?? "mcq") === "mcq");
  const mcqTotal = mcqQuestions.length;
  if (mcqTotal === 0) return { mcqCorrect: 0, mcqTotal: 0, mcqScore: 0 };
  const mcqCorrect = mcqQuestions.filter(
    (q) => answers[q.id]?.selectedOptionId != null,
  ).length;
  const mcqScore = calculateScore(mcqCorrect, mcqTotal);
  return { mcqCorrect, mcqTotal, mcqScore };
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
