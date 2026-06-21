export type ExamResultStatus = "completed" | "submitted_pending_essay";

export interface QuestionResult {
  questionId: string;
  index: number;
  text: string;
  /** Question type — optional; absence is treated as "mcq". */
  type?: "mcq" | "essay";
  options: { id: string; text: string }[];
  selectedOptionId: string | null; // null = skipped
  correctOptionId: string | null; // null for essay (no single correct option)
  isCorrect: boolean | null; // null for essay (graded manually by teacher)
  textAnswer?: string | null; // essay student free-text answer
}

export interface ExamResult {
  examId: string;
  examTitle: string;
  status: ExamResultStatus;
  score: number | null; // null while essay is pending (ADR-0048)
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  timeTakenSeconds: number;
  rank: number | null;
  percentile: number | null;
  passed: boolean | null; // null while essay is pending (ADR-0048)
  mcqScore: number | null; // partial auto-graded MCQ score
  mcqMax: number | null; // max points allocated to MCQ section
  essayMax: number | null; // max points allocated to essay section
  essayCount: number; // number of essay questions awaiting grading
  questionResults: QuestionResult[];
}

/** A result is final (has a total score) only when its status is "completed". */
export function isResultFinal(result: ExamResult): boolean {
  return result.status === "completed";
}
