import "server-only";

import type { AxiosInstance } from "axios";
import { EXAM_EP } from "@/bootstrap/endpoint/exam.endpoint";
import type { ExamSummary } from "../../domain/entities/exam.entity";
import type { ExamQuestion } from "../../domain/entities/exam-question.entity";
import type { ExamResult } from "../../domain/entities/exam-result.entity";
import type {
  IExamRepository,
  SubmitExamInput,
} from "../../domain/repositories/i-exam.repository";
import type {
  ExamQuestionsDto,
  ExamResultDto,
  ExamsListDto,
  SubmitExamDto,
} from "../dtos/exam-response.dto";
import {
  mapExamQuestion,
  mapExamResult,
  mapExamSummary,
} from "../mappers/exam.mapper";

export class ExamRepository implements IExamRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listExams(studentId: string): Promise<ExamSummary[]> {
    const data = (await this.http.get(EXAM_EP.list, {
      params: { studentId },
    })) as unknown as ExamsListDto;
    return data.exams.map(mapExamSummary);
  }

  async getQuestions(examId: string): Promise<ExamQuestion[]> {
    const data = (await this.http.get(
      EXAM_EP.questions(examId),
    )) as unknown as ExamQuestionsDto;
    return data.questions.map(mapExamQuestion);
  }

  async submitExam(input: SubmitExamInput): Promise<ExamResult> {
    const body: SubmitExamDto = {
      examId: input.examId,
      answers: input.answers.map((a) =>
        a.type === "essay"
          ? {
              questionId: a.questionId,
              type: "essay",
              textAnswer: a.textAnswer,
            }
          : {
              questionId: a.questionId,
              type: "mcq",
              selectedOptionId: a.selectedOptionId,
            },
      ),
      startedAt: input.startedAt,
    };
    const data = (await this.http.post(
      EXAM_EP.submit(input.examId),
      body,
    )) as unknown as ExamResultDto;
    return mapExamResult(data);
  }

  async getResult(examId: string): Promise<ExamResult> {
    const data = (await this.http.get(
      EXAM_EP.result(examId),
    )) as unknown as ExamResultDto;
    return mapExamResult(data);
  }
}
