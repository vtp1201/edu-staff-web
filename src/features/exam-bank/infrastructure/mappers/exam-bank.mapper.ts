import type { ExamBankDetail } from "../../domain/entities/exam-bank-detail.entity";
import type { ExamBankQuestion } from "../../domain/entities/exam-bank-question.entity";
import type { ExamBankSummary } from "../../domain/entities/exam-bank-summary.entity";
import type { ExamBankDetailResponseDto } from "../dtos/exam-bank-detail-response.dto";
import type { ExamBankSummaryDto } from "../dtos/exam-bank-list-response.dto";
import type { ExamBankQuestionDto } from "../dtos/exam-bank-question-response.dto";

export function mapExamBankSummary(dto: ExamBankSummaryDto): ExamBankSummary {
  return {
    id: dto.id,
    title: dto.title,
    subjectId: dto.subjectId,
    subjectName: dto.subjectName,
    teacherId: dto.teacherId,
    teacherName: dto.teacherName,
    totalQuestions: dto.totalQuestions,
    durationMinutes: dto.durationMinutes,
    maxAttempts: dto.maxAttempts,
    status: dto.status,
    createdAt: dto.createdAt,
  };
}

function mapQuestion(dto: ExamBankQuestionDto): ExamBankQuestion {
  return {
    id: dto.id,
    index: dto.index,
    content: dto.content,
    options: dto.options.map((o) => ({ id: o.id, text: o.text })),
    correctOptionId: dto.correctOptionId,
    difficulty: dto.difficulty,
    subjectId: dto.subjectId,
  };
}

export function mapExamBankDetail(
  dto: ExamBankDetailResponseDto,
): ExamBankDetail {
  return {
    ...mapExamBankSummary(dto),
    questions: dto.questions.map(mapQuestion),
  };
}
