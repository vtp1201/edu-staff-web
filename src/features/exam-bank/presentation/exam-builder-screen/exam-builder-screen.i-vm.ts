import type { ExamBankDetail } from "../../domain/entities/exam-bank-detail.entity";
import type {
  CreateExamInput,
  UpdateExamInput,
} from "../../domain/entities/exam-bank-input.entity";
import type { ExamBankFailure } from "../../domain/failures/exam-bank.failure";
import type { SubjectOption } from "../exam-bank-screen/exam-bank-screen.i-vm";

export type BuilderActionResult =
  | { ok: true }
  | { ok: false; errorKey: ExamBankFailure["type"] };

export type CreateActionResult =
  | { ok: true; id: string }
  | { ok: false; errorKey: ExamBankFailure["type"] };

export interface ExamBuilderScreenVM {
  initial?: ExamBankDetail;
  subjects: SubjectOption[];
  /** Whether the question move-up/move-down controls do anything. False in real
   *  mode: position is server-assigned by insertion order and no reorder route
   *  exists (US-E18.28/ADR 0056 Amendment 2). Defaults to true (mock). */
  reorderEnabled?: boolean;
  /** Whether the Subject / Max-attempts fields can be edited. False in real
   *  mode: neither round-trips (`subjectId` immutable server-side, `maxAttempts`
   *  has no wire field), so leaving them editable would report a false success
   *  (review MUST FIX, US-E18.28). Defaults to true (mock). */
  metaEditable?: boolean;
  /**
   * Whether every question must be complete before a DRAFT can be SAVED.
   *
   * False (default) keeps draft-save lenient — only the title is required, so a
   * teacher can reserve an empty question slot and come back later. Publish is
   * gated separately and always requires completeness.
   *
   * True only in real mode: an incomplete question is rejected by the server
   * with a generic `VALIDATION_FAILED`, and because the real `updateExam`
   * sequence is non-atomic that error arrives AFTER earlier deletes/edits have
   * already persisted. Mock mode is pure local state, so it has neither problem.
   */
  requireCompleteQuestions?: boolean;
  saveDraftAction(input: UpdateExamInput): Promise<BuilderActionResult>;
  createExamAction(input: CreateExamInput): Promise<CreateActionResult>;
  publishExamAction(id: string): Promise<BuilderActionResult>;
}
