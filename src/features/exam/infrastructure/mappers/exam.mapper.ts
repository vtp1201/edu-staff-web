import type { ExamSummary } from "../../domain/entities/exam.entity";
import type { ExamQuestion } from "../../domain/entities/exam-question.entity";
import type {
  ExamResult,
  ExamResultStatus,
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
    hasEssayQuestions: dto.hasEssayQuestions,
    essayCount: dto.essayCount,
    essayMax: dto.essayMax,
    mcqScore: dto.mcqScore,
    mcqMax: dto.mcqMax,
    questionTypes: dto.questionTypes?.map((t) =>
      t === "essay" ? "essay" : "mcq",
    ),
  };
}

export function mapExamQuestion(dto: ExamQuestionDto): ExamQuestion {
  return {
    id: dto.id,
    index: dto.index,
    type: dto.type === "essay" ? "essay" : "mcq",
    text: dto.text,
    options: dto.options.map((o) => ({ id: o.id, text: o.text })),
  };
}

export function mapQuestionResult(dto: QuestionResultDto): QuestionResult {
  return {
    questionId: dto.questionId,
    index: dto.index,
    type: dto.type === "essay" ? "essay" : "mcq",
    text: dto.text,
    options: dto.options,
    selectedOptionId: dto.selectedOptionId,
    correctOptionId: dto.correctOptionId,
    isCorrect: dto.isCorrect,
    textAnswer: dto.textAnswer,
  };
}

function mapResultStatus(status: string | undefined): ExamResultStatus {
  return status === "submitted_pending_essay"
    ? "submitted_pending_essay"
    : "completed";
}

export function mapExamResult(dto: ExamResultDto): ExamResult {
  return {
    examId: dto.examId,
    examTitle: dto.examTitle,
    status: mapResultStatus(dto.status),
    score: dto.score,
    totalQuestions: dto.totalQuestions,
    correctCount: dto.correctCount,
    incorrectCount: dto.incorrectCount,
    skippedCount: dto.skippedCount,
    timeTakenSeconds: dto.timeTakenSeconds,
    rank: dto.rank,
    percentile: dto.percentile,
    passed: dto.passed,
    mcqScore: dto.mcqScore ?? null,
    mcqMax: dto.mcqMax ?? null,
    essayMax: dto.essayMax ?? null,
    essayCount: dto.essayCount ?? 0,
    questionResults: dto.questionResults.map(mapQuestionResult),
  };
}
