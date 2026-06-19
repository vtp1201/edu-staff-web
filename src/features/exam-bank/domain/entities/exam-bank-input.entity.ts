import type { ExamBankQuestion } from "./exam-bank-question.entity";

export interface CreateExamInput {
  title: string;
  subjectId: string;
  durationMinutes: number;
  maxAttempts: number;
  questions: ExamBankQuestion[];
}

export interface UpdateExamInput {
  id: string;
  title: string;
  subjectId: string;
  durationMinutes: number;
  maxAttempts: number;
  questions: ExamBankQuestion[];
}
