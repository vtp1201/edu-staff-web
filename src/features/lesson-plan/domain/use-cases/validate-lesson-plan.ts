import {
  type CreateLessonPlanInput,
  DOCUMENT_SECTION_KEYS,
  type DocumentSectionKey,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  MAX_TITLE_LENGTH,
  SECTION_MAX_LENGTH,
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

/**
 * Client-only per-section length guard (FR-002 AC-002.3). The BE exposes NO
 * error code for section length, so this deliberately does NOT return a
 * `LessonPlanFailure` — it is a presentation guard (like the FR-003
 * publish-readiness gate) that blocks Save Draft locally. Returns the section
 * keys whose content exceeds its configured limit (`[]` when all pass).
 */
export function sectionLengthViolations(
  sections: Partial<Record<DocumentSectionKey, string>>,
): DocumentSectionKey[] {
  return DOCUMENT_SECTION_KEYS.filter(
    (k) => (sections[k]?.length ?? 0) > SECTION_MAX_LENGTH[k],
  );
}
