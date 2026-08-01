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
  saveDraftAction(input: UpdateExamInput): Promise<BuilderActionResult>;
  createExamAction(input: CreateExamInput): Promise<CreateActionResult>;
  publishExamAction(id: string): Promise<BuilderActionResult>;
}
