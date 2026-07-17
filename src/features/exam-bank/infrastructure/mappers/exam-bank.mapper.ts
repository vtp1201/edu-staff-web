import type { ExamBankDetail } from "../../domain/entities/exam-bank-detail.entity";
import type { ExamBankQuestion } from "../../domain/entities/exam-bank-question.entity";
import type {
  ExamBankStatus,
  ExamBankSummary,
} from "../../domain/entities/exam-bank-summary.entity";
import type { ExamBankDetailResponseDto } from "../dtos/exam-bank-detail-response.dto";
import type {
  ExamBankSummaryDto,
  WireExamStatus,
} from "../dtos/exam-bank-list-response.dto";
import type { ExamBankQuestionDto } from "../dtos/exam-bank-question-response.dto";

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

/**
 * Map a wire question to the entity. The wire has no options array, no per-
 * question id, and no difficulty — so `options` is empty, `id` derives from
 * `position`, `correctOptionId` reuses `answerKey` (MCQ only), and `difficulty`
 * defaults (non-persistent). This is intentionally lossy: the builder edit flow
 * is blocked in real mode (US-E18.15/ADR 0056), so an empty-options round-trip
 * never reaches an editor.
 */
function mapQuestion(
  dto: ExamBankQuestionDto,
  subjectId: string,
): ExamBankQuestion {
  return {
    id: `q-${dto.position}`,
    index: dto.position - 1,
    content: dto.body,
    options: [],
    correctOptionId: dto.answerKey ?? "",
    difficulty: "medium",
    subjectId,
  };
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
