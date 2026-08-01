import type { ExamBankDetail } from "../../domain/entities/exam-bank-detail.entity";
import type {
  ExamBankOption,
  ExamBankQuestion,
  ExamDifficulty,
} from "../../domain/entities/exam-bank-question.entity";
import type {
  ExamBankStatus,
  ExamBankSummary,
} from "../../domain/entities/exam-bank-summary.entity";
import type { ExamBankDetailResponseDto } from "../dtos/exam-bank-detail-response.dto";
import type {
  ExamBankSummaryDto,
  WireExamStatus,
} from "../dtos/exam-bank-list-response.dto";
import type {
  ExamBankQuestionDto,
  WireDifficulty,
} from "../dtos/exam-bank-question-response.dto";
import type { ExamBankQuestionWriteDto } from "../dtos/exam-bank-question-write.dto";

/** Default number of attempts — non-persistent on the wire (US-E18.15/ADR 0056). */
const DEFAULT_MAX_ATTEMPTS = 1;

const STATUS_MAP: Record<WireExamStatus, ExamBankStatus> = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CONFIDENTIAL: "confidential",
};

export function mapExamStatus(wire: WireExamStatus): ExamBankStatus {
  return STATUS_MAP[wire];
}

/**
 * Map an `ExamPaperResponse` to the summary entity.
 *
 * `subjectName` is resolved by the repository via a `subject-catalogue` fan-out
 * (the wire has no name). `teacherName` has NO wire source (`ExamPaperResponse`
 * carries only `authorId` — cross-repo ask #21) → falls back to the `authorId`
 * itself, a documented placeholder consistent with prior IAM-name-gap precedent.
 * `maxAttempts` is non-persistent (defaulted); `totalQuestions` is derived from
 * the question array the response always carries.
 */
export function mapExamBankSummary(
  dto: ExamBankSummaryDto,
  subjectName: string,
): ExamBankSummary {
  return {
    id: dto.examPaperId,
    title: dto.title,
    subjectId: dto.subjectId,
    subjectName,
    teacherId: dto.authorId,
    teacherName: dto.authorId,
    totalQuestions: dto.questions.length,
    durationMinutes: dto.durationMinutes,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
    status: mapExamStatus(dto.status),
    // Normalize RFC3339 → YYYY-MM-DD to match the mock's date-only display.
    createdAt: dto.createdAt.slice(0, 10),
  };
}

/** Default per-question weight when the entity carries none (ADR 0056 Am. 2). */
const DEFAULT_QUESTION_MARKS = 1;

const DIFFICULTY_MAP: Record<WireDifficulty, ExamDifficulty> = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
};

const WIRE_DIFFICULTY: Record<ExamDifficulty, WireDifficulty> = {
  easy: "EASY",
  medium: "MEDIUM",
  hard: "HARD",
};

/**
 * Map a wire question to the entity — lossless since core US-152
 * (US-E18.28/ADR 0056 Amendment 2). The entity `id` is the server
 * `questionId`: the `updateExam` diff-sync decides "already exists on the
 * server" by matching a local question's `id` against it, so a synthetic id
 * here would make every edit look like a fresh append.
 *
 * `correctOptionId` prefers the structured field and falls back to `answerKey`
 * (an option-less MCQ carries its answer there); both are absent when stripped
 * for an unauthorized reader. `difficulty` is optional on the wire ("" = unset)
 * → defaults to `medium`, matching the builder's own default.
 */
function mapQuestion(
  dto: ExamBankQuestionDto,
  subjectId: string,
): ExamBankQuestion {
  return {
    id: dto.questionId,
    index: dto.position - 1,
    content: dto.body,
    options: (dto.options ?? []).map((o) => ({
      id: o.id as ExamBankOption["id"],
      text: o.text,
    })),
    correctOptionId: dto.correctOptionId || (dto.answerKey ?? ""),
    difficulty: dto.difficulty ? DIFFICULTY_MAP[dto.difficulty] : "medium",
    subjectId,
    questionType: dto.questionType,
    marks: dto.marks,
  };
}

/**
 * Map an entity question to the add/edit request body (US-E18.28).
 *
 * Only options with text are sent — the builder always seeds four blank slots
 * and the server rejects an empty option text (`EXAM_MCQ_OPTIONS_INVALID`).
 * Fewer than two filled options is not a valid option list, so the body falls
 * back to the option-less MCQ shape (`answerKey` only). A non-MCQ question may
 * carry none of options / correctOptionId / answerKey
 * (`EXAM_OPTIONS_NOT_ALLOWED` / `EXAM_ANSWER_KEY_NOT_ALLOWED`).
 */
export function mapQuestionToWire(
  question: ExamBankQuestion,
): ExamBankQuestionWriteDto {
  const questionType = question.questionType ?? "MCQ";
  const marks =
    question.marks && question.marks >= DEFAULT_QUESTION_MARKS
      ? question.marks
      : DEFAULT_QUESTION_MARKS;

  const body: ExamBankQuestionWriteDto = {
    questionType,
    body: question.content,
    marks,
    difficulty: WIRE_DIFFICULTY[question.difficulty],
  };

  if (questionType !== "MCQ") return body;

  const filledOptions = question.options.filter((o) => o.text?.trim());
  if (filledOptions.length >= 2) {
    body.options = filledOptions.map((o) => ({ id: o.id, text: o.text }));
    if (question.correctOptionId) {
      body.correctOptionId = question.correctOptionId;
    }
  }
  // `answerKey` mirrors the correct option — required outright for an
  // option-less MCQ, harmless (and consistent with US-E18.15) otherwise.
  if (question.correctOptionId) body.answerKey = question.correctOptionId;

  return body;
}

export function mapExamBankDetail(
  dto: ExamBankDetailResponseDto,
  subjectName: string,
): ExamBankDetail {
  return {
    ...mapExamBankSummary(dto, subjectName),
    questions: dto.questions.map((q) => mapQuestion(q, dto.subjectId)),
  };
}
