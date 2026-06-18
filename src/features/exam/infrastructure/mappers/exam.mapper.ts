import type { ExamSummary } from "../../domain/entities/exam.entity";
import type { ExamQuestion } from "../../domain/entities/exam-question.entity";
import type {
  ExamResult,
  QuestionResult,
} from "../../domain/entities/exam-result.entity";
import type {
  ExamQuestionDto,
  ExamResultDto,
  ExamSummaryDto,
  QuestionResultDto,
} from "../dtos/exam-response.dto";

export function mapExamSummary(dto: ExamSummaryDto): ExamSummary {
  return {
    id: dto.id,
    title: dto.title,
    subjectId: dto.subjectId,
    subjectName: dto.subjectName,
    subjectColor: dto.subjectColor as ExamSummary["subjectColor"],
    teacherName: dto.teacherName,
    description: dto.description,
    durationMinutes: dto.durationMinutes,
    totalQuestions: dto.totalQuestions,
    deadline: dto.deadline,
    status: dto.status as ExamSummary["status"],
    type: dto.type as ExamSummary["type"],
  };
}

export function mapExamQuestion(dto: ExamQuestionDto): ExamQuestion {
  return {
    id: dto.id,
    index: dto.index,
    text: dto.text,
    options: dto.options.map((o) => ({ id: o.id, text: o.text })),
  };
}

export function mapQuestionResult(dto: QuestionResultDto): QuestionResult {
  return {
    questionId: dto.questionId,
    index: dto.index,
    text: dto.text,
    options: dto.options,
    selectedOptionId: dto.selectedOptionId,
    correctOptionId: dto.correctOptionId,
    isCorrect: dto.isCorrect,
  };
}

export function mapExamResult(dto: ExamResultDto): ExamResult {
  return {
    examId: dto.examId,
    examTitle: dto.examTitle,
    score: dto.score,
    totalQuestions: dto.totalQuestions,
    correctCount: dto.correctCount,
    incorrectCount: dto.incorrectCount,
    skippedCount: dto.skippedCount,
    timeTakenSeconds: dto.timeTakenSeconds,
    rank: dto.rank,
    percentile: dto.percentile,
    passed: dto.passed,
    questionResults: dto.questionResults.map(mapQuestionResult),
  };
}
