"use client";

import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";
import type { ExamBankQuestion } from "../../domain/entities/exam-bank-question.entity";

type QuestionListItemProps = {
  question: ExamBankQuestion;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  hasError: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

export function QuestionListItem({
  question,
  isSelected,
  isFirst,
  isLast,
  hasError,
  onSelect,
  onMoveUp,
  onMoveDown,
}: QuestionListItemProps) {
  const t = useTranslations("examBank");
  const displayIndex = question.index + 1;
  const preview = question.content.trim()
    ? question.content.trim().slice(0, 60)
    : t("builder.newQuestionPlaceholder");

  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-[var(--edu-radius-btn)] border p-2",
        isSelected
          ? "border-primary bg-primary/12"
          : "border-border bg-card hover:bg-muted/60",
        hasError && "border-edu-error",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-current={isSelected}
      >
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full font-bold text-xs",
            isSelected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {displayIndex}
        </span>
        <span className="min-w-0 flex-1 truncate text-foreground text-sm">
          {preview}
        </span>
        {hasError && (
          <>
            <AlertCircle
              className="size-4 shrink-0 text-edu-error"
              aria-hidden="true"
            />
            <span className="sr-only">
              {", "}
              {t("builder.questionHasError")}
            </span>
          </>
        )}
      </button>

      <div className="flex shrink-0 flex-col">
        <Button
          variant="ghost"
          size="icon"
          className="size-6 min-h-11 min-w-11"
          disabled={isFirst}
          onClick={onMoveUp}
          aria-label={t("moveUpAriaLabel", { index: displayIndex })}
        >
          <ChevronUp className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 min-h-11 min-w-11"
          disabled={isLast}
          onClick={onMoveDown}
          aria-label={t("moveDownAriaLabel", { index: displayIndex })}
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}
