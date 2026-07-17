import type { ExamBankQuestion } from "../entities/exam-bank-question.entity";
import type { ExamBankFailure } from "../failures/exam-bank.failure";

/** Per-question publishability failure type (subset of ExamBankFailure). */
export type QuestionFailureType =
  | "question-empty-content"
  | "question-missing-answer"
  | "insufficient-options";

/** Validate a single question. Returns the first failing rule, or null if valid. */
export function validateQuestion(
  question: ExamBankQuestion,
): QuestionFailureType | null {
  if (!question.content?.trim()) return "question-empty-content";
  // Real-mode questions (US-E18.15/ADR 0056) carry no client-side options model
  // — the wire question shape is `{questionType, body, answerKey, marks}` with no
  // options array, and each question was already validated server-side at write
  // time. There is no write path here to re-validate against, so when `options`
  // is absent/empty (real data) the MCQ-specific checks pass through. Only the
  // mock builder authors the 4-option MCQ model these checks target.
  if (!question.options || question.options.length === 0) return null;
  const nonEmptyOptions = question.options.filter((o) => o.text?.trim());
  if (nonEmptyOptions.length < 2) return "insufficient-options";
  if (!question.correctOptionId?.trim()) return "question-missing-answer";
  return null;
}

/**
 * Validate the full questions array for publish. Returns an ExamBankFailure on
 * the first problem, or null when the exam is publishable.
 */
export function validateQuestionsForPublish(
  questions: ExamBankQuestion[],
): ExamBankFailure | null {
  if (questions.length === 0) return { type: "no-questions" };
  for (const q of questions) {
    const failure = validateQuestion(q);
    if (failure) return { type: failure };
  }
  return null;
}
