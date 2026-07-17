"use client";

import { List, type LucideIcon, PenLine, ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";
import type { QuestionType } from "../../domain/entities/question.entity";

export interface QBQuestionTypeSelectorProps {
  value: QuestionType;
  /** True when isEdit — questionType is immutable post-create (FR-009). */
  disabled: boolean;
  onChange: (value: QuestionType) => void;
}

const OPTIONS: { key: QuestionType; icon: LucideIcon }[] = [
  { key: "ESSAY", icon: ScrollText },
  { key: "SHORT_ANSWER", icon: PenLine },
  { key: "FILL_IN", icon: List },
];

/**
 * 3-option segmented control for questionType (no MCQ, FR-006/FR-014).
 * `fieldset`/`legend` + per-option `aria-pressed` so assistive tech understands
 * the single-select semantics (NFR-002). Fully disabled on the edit route.
 */
export function QBQuestionTypeSelector({
  value,
  disabled,
  onChange,
}: QBQuestionTypeSelectorProps) {
  const t = useTranslations("questionBank");
  const tType = useTranslations("questionBank.questionType");

  return (
    <fieldset
      disabled={disabled}
      className="rounded-xl border border-border bg-card p-4.5"
    >
      <legend className="mb-2 font-extrabold text-[10.5px] text-edu-text-secondary uppercase tracking-wide">
        {t("builder.questionTypeLabel")}
      </legend>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map(({ key, icon: Icon }) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onChange(key)}
              className={cn(
                "inline-flex min-h-11 flex-1 basis-32 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 font-bold text-sm transition-colors",
                active
                  ? "border-primary/40 bg-primary/12 text-primary"
                  : "border-border bg-card text-edu-text-secondary hover:bg-muted",
                disabled && "cursor-not-allowed opacity-70",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {tType(key)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
