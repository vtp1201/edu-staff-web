import type { ExamSummary } from "../entities/exam.entity";
import type { ExamQuestion } from "../entities/exam-question.entity";
import type { ExamResult } from "../entities/exam-result.entity";

export interface SubmitExamInput {
  examId: string;
  answers: { questionId: string; selectedOptionId: string | null }[];
  startedAt: number; // unix timestamp ms
}

export interface IExamRepository {
  listExams(studentId: string): Promise<ExamSummary[]>;
  getQuestions(examId: string): Promise<ExamQuestion[]>;
  submitExam(input: SubmitExamInput): Promise<ExamResult>;
  getResult(examId: string): Promise<ExamResult>;
}
