import type { ExamSummary } from "../entities/exam.entity";
import type { ExamQuestion } from "../entities/exam-question.entity";
import type { ExamResult } from "../entities/exam-result.entity";

/** Discriminated answer union — MCQ carries a selected option, essay carries free text. */
export type SubmitAnswer =
  | { questionId: string; type: "mcq"; selectedOptionId: string | null }
  | { questionId: string; type: "essay"; textAnswer: string };

export interface SubmitExamInput {
  examId: string;
  answers: SubmitAnswer[];
  startedAt: number; // unix timestamp ms
}

export interface IExamRepository {
  listExams(studentId: string): Promise<ExamSummary[]>;
  getQuestions(examId: string): Promise<ExamQuestion[]>;
  submitExam(input: SubmitExamInput): Promise<ExamResult>;
  getResult(examId: string): Promise<ExamResult>;
}
