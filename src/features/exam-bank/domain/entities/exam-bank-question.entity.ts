export type ExamOptionId = "A" | "B" | "C" | "D";

export type ExamDifficulty = "easy" | "medium" | "hard";

export interface ExamBankOption {
  id: ExamOptionId;
  text: string;
}

export interface ExamBankQuestion {
  id: string;
  index: number;
  content: string;
  options: ExamBankOption[];
  correctOptionId: string;
  difficulty: ExamDifficulty;
  subjectId: string;
}
