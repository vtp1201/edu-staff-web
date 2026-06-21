export interface ExamOption {
  id: string; // "A" | "B" | "C" | "D"
  text: string;
}

export type ExamQuestionType = "mcq" | "essay";

export interface ExamQuestion {
  id: string;
  index: number; // 1-based
  /** Question type — optional; absence is treated as "mcq" by all consumers. */
  type?: ExamQuestionType;
  text: string;
  options: ExamOption[];
}
