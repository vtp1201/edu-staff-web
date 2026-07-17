import type {
  Difficulty,
  QuestionEntity,
  QuestionPage,
  QuestionType,
} from "../domain/entities/question.entity";
import type { QuestionBankFailure } from "../domain/failures/question-bank.failure";

/** Subject option for the filter/meta-grid select (redeclared per-feature). */
export interface SubjectOption {
  id: string;
  name: string;
}

/** Grade-level options for the builder select + list filter (design QB_GRADES). */
export const GRADE_OPTIONS = ["10", "11", "12"] as const;

/** List/search scope toggle — a UI concept only, not a BE param (spec §1). */
export type ListScope = "mine" | "search";

/** Server Action result for cursor-paginated list/search fetches. */
export type ListActionResult =
  | { ok: true; page: QuestionPage }
  | { ok: false; errorKey: QuestionBankFailure["type"] };

/** Server Action result for create/update/publish/refetch (returns the question). */
export type BuilderActionResult =
  | { ok: true; question: QuestionEntity }
  | { ok: false; errorKey: QuestionBankFailure["type"] };

export type { Difficulty, QuestionEntity, QuestionPage, QuestionType };
