export interface QuestionResult {
  questionId: string;
  index: number;
  text: string;
  options: { id: string; text: string }[];
  selectedOptionId: string | null; // null = skipped
  correctOptionId: string;
  isCorrect: boolean;
}

export interface ExamResult {
  examId: string;
  examTitle: string;
  score: number; // 0-10 (correct/total * 10, rounded 1 decimal)
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  timeTakenSeconds: number;
  rank: number | null;
  percentile: number | null;
  passed: boolean; // score >= 5
  questionResults: QuestionResult[];
}
