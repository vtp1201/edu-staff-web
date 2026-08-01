/**
 * Wire shape of a single exam-paper question (`ExamQuestionResponse`,
 * ground-truthed `internal/lms/exambank/adapter/http/dto/response.go` after
 * core US-152 — US-E18.28/ADR 0056 Amendment 2).
 *
 * `questionId` is the server identity the edit/remove routes address. MCQ
 * questions now carry a structured `options` array (2–4, ids A–D) plus
 * `correctOptionId`; `answerKey` remains the free-text answer of an option-less
 * MCQ. `answerKey`/`correctOptionId` are omitted when stripped for an
 * unauthorized reader (a published paper read by a non-author); `options` (the
 * visible choices) are NOT stripped. `difficulty` is optional ("" = unset).
 */
export type WireQuestionType = "MCQ" | "ESSAY" | "SHORT_ANSWER" | "FILL_IN";

export type WireDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface ExamBankQuestionOptionDto {
  id: string;
  text: string;
}

export interface ExamBankQuestionDto {
  questionId: string;
  position: number;
  questionType: WireQuestionType;
  body: string;
  answerKey?: string | null;
  marks: number;
  options?: ExamBankQuestionOptionDto[];
  correctOptionId?: string;
  difficulty?: WireDifficulty | "";
}
