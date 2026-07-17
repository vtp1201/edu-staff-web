"use client";

import { useTranslations } from "next-intl";
import { TagChipsInput } from "@/components/shared/tag-chips-input";
import {
  MAX_TAG_LENGTH,
  MAX_TAGS,
} from "../../domain/entities/question.entity";

export interface QBTagChipsInputProps {
  tags: string[];
  isLocked: boolean;
  onChange: (tags: string[]) => void;
  /** id of the visible Tags label to link the input to (aria-labelledby). */
  labelledBy?: string;
}

/**
 * Thin wrapper over the shared `TagChipsInput` (promoted US-E11.9): passes
 * question-bank's own MAX_TAGS/MAX_TAG_LENGTH constants + `questionBank.*`
 * labels. Not a fork.
 */
export function QBTagChipsInput({
  tags,
  isLocked,
  onChange,
  labelledBy,
}: QBTagChipsInputProps) {
  const t = useTranslations("questionBank.builder");
  return (
    <TagChipsInput
      tags={tags}
      isLocked={isLocked}
      onChange={onChange}
      labelledBy={labelledBy}
      maxTags={MAX_TAGS}
      maxTagLength={MAX_TAG_LENGTH}
      labels={{
        placeholder: t("tagsPlaceholder"),
        inputAriaLabel: t("tagsLabel"),
        maxTagsHelper: t("tagLimitHelper"),
        tagTooLongError: t("tagTooLongHelper"),
        removeAriaLabelOf: (tag) => t("tagRemoveAriaLabel", { tag }),
      }}
    />
  );
}
