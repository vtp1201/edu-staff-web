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
  // Since core US-152 (US-E18.28) real MCQ questions DO carry a structured
  // options array, so real and mock data share one shape and get validated
  // identically here. An EMPTY options array is still legitimate — it is the
  // option-less MCQ (answer carried by `answerKey` alone) and every non-MCQ
  // type — and the server owns those rules, so it passes through.
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
