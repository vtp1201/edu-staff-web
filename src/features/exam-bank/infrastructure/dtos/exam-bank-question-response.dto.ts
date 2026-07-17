/**
 * Wire shape of a single exam-paper question (`ExamQuestionResponse`,
 * ground-truthed `internal/lms/exambank/adapter/http/dto/response.go`).
 * There is NO options array on the wire — an MCQ carries only `answerKey`
 * (a single string; the correct option's identifying value). `answerKey` is
 * absent/null when stripped for an unauthorized reader (US-E18.15/ADR 0056).
 */
export type WireQuestionType = "MCQ" | "ESSAY" | "SHORT_ANSWER" | "FILL_IN";

export interface ExamBankQuestionDto {
  position: number;
  questionType: WireQuestionType;
  body: string;
  answerKey?: string | null;
  marks: number;
}
