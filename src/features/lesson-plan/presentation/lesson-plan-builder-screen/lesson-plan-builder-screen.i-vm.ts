import type { LessonPlanEntity } from "../../domain/entities/lesson-plan.entity";
import type { BuilderActionResult, SubjectOption } from "../shared.i-vm";

/** Controlled builder form values (title/grade/tags + 4 sections). */
export interface LessonPlanDraftInput {
  title: string;
  gradeLevel: string;
  tags: string[];
  objectives: string;
  contentOutline: string;
  activities: string;
  assessmentMethod: string;
}

/** Save-draft payload — `id` present ⇒ update (PUT), absent ⇒ create (POST). */
export interface SaveDraftInput extends LessonPlanDraftInput {
  id?: string;
  subjectId: string;
}

export interface LessonPlanBuilderScreenVM {
  /** Populated in edit mode (RSC-loaded, FR-008-gated). Undefined = create mode. */
  initial: LessonPlanEntity | undefined;
  /** Edit-route id (used for publish/refetch/retry). Undefined in create mode. */
  planId?: string;
  /** Edit-route GET failed with a transient error (AC-008.6 — stay on route). */
  loadFailed?: boolean;
  subjects: SubjectOption[];
  gradeOptions: string[];
  /** RSC-computed list path for back-nav + race/forbidden/not-found redirects. */
  lessonPlansPath: string;
  /** RSC-computed prefix; the client builds `${editPathPrefix}/${id}/edit`. */
  editPathPrefix: string;
  /** Create (no id) or update (id). Returns the persisted plan. */
  saveDraftAction: (input: SaveDraftInput) => Promise<BuilderActionResult>;
  /** One-way DRAFT → PUBLISHED (INT-118-06). */
  publishAction: (id: string) => Promise<BuilderActionResult>;
  /** Re-GET the plan (already-published race resync + AC-008.6 retry). */
  refetchAction: (id: string) => Promise<BuilderActionResult>;
}

export type { BuilderActionResult, LessonPlanEntity, SubjectOption };
