import {
  type CreateLessonPlanInput,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  MAX_TITLE_LENGTH,
  type UpdateLessonPlanInput,
} from "../entities/lesson-plan.entity";
import type { LessonPlanFailure } from "../failures/lesson-plan.failure";

/**
 * Pure client-side write-input guards (defense-in-depth for FR-001/FR-002/FR-009
 * — the BE re-validates authoritatively). Returns the first failure, or null if
 * the input passes every guard. Shared by create + update use-cases.
 */
export function validateWriteInput(
  input: CreateLessonPlanInput | UpdateLessonPlanInput,
): LessonPlanFailure | null {
  const title = input.title?.trim() ?? "";
  if (title.length === 0) return { type: "title-required" };
  if (input.title.length > MAX_TITLE_LENGTH) return { type: "title-too-long" };

  const tags = input.tags ?? [];
  if (tags.length > MAX_TAGS) return { type: "tag-limit-exceeded" };
  if (tags.some((t) => t.length > MAX_TAG_LENGTH))
    return { type: "tag-too-long" };

  return null;
}
