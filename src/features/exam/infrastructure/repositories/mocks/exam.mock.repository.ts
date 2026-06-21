import "server-only";

import { mockDelay } from "@/bootstrap/lib/mock";
import type { ExamSummary } from "../../../domain/entities/exam.entity";
import type { ExamQuestion } from "../../../domain/entities/exam-question.entity";
import type { ExamResult } from "../../../domain/entities/exam-result.entity";
import type {
  IExamRepository,
  SubmitExamInput,
} from "../../../domain/repositories/i-exam.repository";
import {
  buildMockResult,
  MOCK_EXAMS,
  MOCK_PENDING_ESSAY_RESULT,
  MOCK_QUESTIONS,
} from "./exam.fixtures";

export class MockExamRepository implements IExamRepository {
  async listExams(_studentId: string): Promise<ExamSummary[]> {
    await mockDelay(200);
    return MOCK_EXAMS;
  }

  async getQuestions(examId: string): Promise<ExamQuestion[]> {
    await mockDelay(150);
    const qs = MOCK_QUESTIONS[examId];
    if (!qs) throw new Error("not-found");
    return qs;
  }

  async submitExam(input: SubmitExamInput): Promise<ExamResult> {
    await mockDelay(300);
    const exam = MOCK_EXAMS.find((e) => e.id === input.examId);
    if (!exam) throw new Error("not-found");
    if (input.examId === "exam-005") return MOCK_PENDING_ESSAY_RESULT;
    return buildMockResult(input.examId);
  }

  async getResult(examId: string): Promise<ExamResult> {
    await mockDelay(150);
    if (examId === "exam-005") return MOCK_PENDING_ESSAY_RESULT;
    return buildMockResult(examId);
  }
}
