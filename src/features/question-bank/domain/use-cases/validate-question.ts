import {
  type CreateQuestionInput,
  MAX_BODY_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  type UpdateQuestionInput,
} from "../entities/question.entity";
import type { QuestionBankFailure } from "../failures/question-bank.failure";

/**
 * Pure client-side write-input guards (defense-in-depth for FR-008 — the BE
 * re-validates authoritatively). Returns the first failure, or `null` if the
 * input passes every guard. Shared by create + update use-cases.
 *
 * FR-007 (the one rule that must NEVER regress): `expectedAnswer` is OPTIONAL
 * for every questionType — this function deliberately has NO expectedAnswer
 * required-check, on create or update.
 */
export function validateWriteInput(
  input: CreateQuestionInput | UpdateQuestionInput,
): QuestionBankFailure | null {
  const body = input.body?.trim() ?? "";
  if (body.length === 0) return { type: "body-required" };
  // Length guard applies to the raw (untrimmed) value, matching the wire cap.
  if (input.body.length > MAX_BODY_LENGTH) return { type: "body-too-long" };

  const tags = input.tags ?? [];
  if (tags.length > MAX_TAGS) return { type: "tag-limit-exceeded" };
  if (tags.some((t) => t.length > MAX_TAG_LENGTH))
    return { type: "tag-too-long" };

  return null;
}
