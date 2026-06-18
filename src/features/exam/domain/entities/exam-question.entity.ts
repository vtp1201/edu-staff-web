export interface ExamOption {
  id: string; // "A" | "B" | "C" | "D"
  text: string;
}

export interface ExamQuestion {
  id: string;
  index: number; // 1-based
  text: string;
  options: ExamOption[];
}
