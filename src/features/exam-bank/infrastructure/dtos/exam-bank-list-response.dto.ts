import type { ExamBankQuestionDto } from "./exam-bank-question-response.dto";

/** Wire status of an exam paper (`ExamPaperResponse.status`). */
export type WireExamStatus = "DRAFT" | "PUBLISHED" | "CONFIDENTIAL";

/**
 * Wire shape of `ExamPaperResponse` (ground-truthed
 * `internal/lms/exambank/adapter/http/dto/response.go`). One shape serves both
 * the single-get and each list item (list items carry their full `questions`).
 *
 * Note the drift from the mock model: id is `examPaperId`, author is `authorId`
 * (no display name — cross-repo ask #21), `gradeLevel`/`totalMarks` are new,
 * and there is NO `subjectName`/`teacherName`/`maxAttempts`/`difficulty` on the
 * wire (resolved/defaulted in the repository + mapper — US-E18.15/ADR 0056).
 */
export interface ExamBankSummaryDto {
  examPaperId: string;
  authorId: string;
  subjectId: string;
  gradeLevel: string;
  title: string;
  totalMarks: number;
  durationMinutes: number;
  status: WireExamStatus;
  questions: ExamBankQuestionDto[];
  createdAt: string;
  updatedAt: string;
}

/** List items ride the standard envelope's `data.items`; pagination is in `meta`. */
export interface ExamBankListResponseDto {
  items: ExamBankSummaryDto[];
}
