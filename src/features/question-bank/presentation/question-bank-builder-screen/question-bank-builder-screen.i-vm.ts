import type {
  Difficulty,
  QuestionEntity,
  QuestionType,
} from "../../domain/entities/question.entity";
import type { BuilderActionResult, SubjectOption } from "../shared.i-vm";

/**
 * Controlled builder form values. The 4 immutable-on-edit fields (FR-009) are
 * part of the draft (create needs them writable); the screen disables their
 * controls when `isEdit` rather than the VM omitting them.
 */
export interface QuestionBankDraftInput {
  questionType: QuestionType;
  subjectId: string;
  gradeLevel: string;
  difficulty: Difficulty;
  body: string;
  expectedAnswer: string; // "" allowed for ALL types (FR-007 — never required)
  tags: string[];
}

/**
 * Save payload — `id` present ⇒ update (only body/expectedAnswer/tags actually
 * sent per FR-009; the action/use-case drops the 4 immutable fields).
 */
export interface SaveQuestionInput extends QuestionBankDraftInput {
  id?: string;
}

export interface QuestionBankBuilderScreenVM {
  /** Populated in edit mode (RSC-loaded, visibility/ownership-gated). Undefined = create. */
  initial: QuestionEntity | undefined;
  questionId?: string;
  /** Edit-route GET failed with a transient error — stay on route, show retry. */
  loadFailed?: boolean;
  subjects: SubjectOption[];
  gradeOptions: string[];
  /** RSC-computed list path for back-nav + race/forbidden/not-found redirects. */
  questionBankPath: string;
  /** RSC-computed prefix; the client builds `${editPathPrefix}/${id}/edit`. */
  editPathPrefix: string;
  saveQuestionAction: (
    input: SaveQuestionInput,
  ) => Promise<BuilderActionResult>;
  /** One-way DRAFT → PUBLISHED. */
  publishAction: (id: string) => Promise<BuilderActionResult>;
  /** Re-GET the question (already-published race resync). */
  refetchAction: (id: string) => Promise<BuilderActionResult>;
}

export type { BuilderActionResult, QuestionEntity, SubjectOption };
