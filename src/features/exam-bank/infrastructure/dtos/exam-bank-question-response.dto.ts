export interface ExamBankOptionDto {
  id: "A" | "B" | "C" | "D";
  text: string;
}

export interface ExamBankQuestionDto {
  id: string;
  index: number;
  content: string;
  options: ExamBankOptionDto[];
  correctOptionId: string;
  difficulty: "easy" | "medium" | "hard";
  subjectId: string;
}
