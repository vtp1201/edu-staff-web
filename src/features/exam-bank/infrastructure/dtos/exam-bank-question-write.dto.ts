import type {
  ExamBankQuestionOptionDto,
  WireDifficulty,
  WireQuestionType,
} from "./exam-bank-question-response.dto";

/**
 * Request body shared verbatim by `AddQuestionRequest`
 * (`POST /exam-papers/:id/questions`) and `UpdateExamQuestionRequest`
 * (`PUT /exam-papers/:id/questions/:questionId`) — ground-truthed
 * `internal/lms/exambank/adapter/http/dto/request.go` (core US-152).
 *
 * Server invariants this body must satisfy (`core/domain/entity/exam_paper.go`
 * `validateOptions`): `marks >= 1`; options only on MCQ, 2–4 of them with
 * unique A–D ids and non-empty text; `correctOptionId` must reference one of
 * them; an option-less MCQ instead requires a non-empty `answerKey`; a non-MCQ
 * question may carry none of options / correctOptionId / answerKey.
 */
export interface ExamBankQuestionWriteDto {
  questionType: WireQuestionType;
  body: string;
  marks: number;
  answerKey?: string;
  options?: ExamBankQuestionOptionDto[];
  correctOptionId?: string;
  difficulty?: WireDifficulty;
}
