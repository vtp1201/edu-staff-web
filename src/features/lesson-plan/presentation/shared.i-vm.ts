import type {
  DocumentSectionKey,
  LessonPlanEntity,
  LessonPlanPage,
} from "../domain/entities/lesson-plan.entity";
import type { LessonPlanFailure } from "../domain/failures/lesson-plan.failure";

/** Subject option for the picker + filter dropdown (redeclared per-feature). */
export interface SubjectOption {
  id: string;
  name: string;
}

/**
 * Grade-level options for the builder select + list filter (design D6 — a small
 * feature-local static list mirroring the mockup's `LP_GRADES = [10, 11, 12]`).
 * `gradeLevel` is a free string on the wire; these are display/input options.
 */
export const GRADE_OPTIONS = ["10", "11", "12"] as const;

/** Owner-toggle scope — a UI concept, not a BE param (spec §1). */
export type ListScope = "mine" | "browse";

/**
 * Failure types that can be shown to the user. `invalid-cursor` is excluded —
 * it is handled silently (drop cursor + refetch page 1, spec §6/AC-006.6) and
 * must never surface, so it must never be passed to a translated `errors.*` key.
 */
export type DisplayableFailureType = Exclude<
  LessonPlanFailure["type"],
  "invalid-cursor"
>;

/** Server Action result for cursor-paginated list fetches. */
export type ListActionResult =
  | { ok: true; page: LessonPlanPage }
  | { ok: false; errorKey: LessonPlanFailure["type"] };

/** Server Action result for create (returns the new id + plan). */
export type CreateActionResult =
  | { ok: true; plan: LessonPlanEntity }
  | { ok: false; errorKey: LessonPlanFailure["type"] };

/** Server Action result for update/publish/refetch (returns the plan). */
export type BuilderActionResult =
  | { ok: true; plan: LessonPlanEntity }
  | { ok: false; errorKey: LessonPlanFailure["type"] };

export type { DocumentSectionKey, LessonPlanEntity, LessonPlanPage };
