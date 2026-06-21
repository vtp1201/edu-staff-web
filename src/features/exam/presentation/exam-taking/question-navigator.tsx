"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ExamQuestion } from "@/features/exam/domain/entities/exam-question.entity";
import { cn } from "@/shared/utils";

export interface QuestionNavigatorProps {
  questions: ExamQuestion[];
  currentIndex: number; // 0-based
  answeredIds: Set<string>;
  flaggedIds: Set<string>;
  essayIds?: Set<string>;
  onJump: (index: number) => void;
}

export function QuestionNavigator({
  questions,
  currentIndex,
  answeredIds,
  flaggedIds,
  essayIds,
  onJump,
}: QuestionNavigatorProps) {
  const t = useTranslations("exam");

  return (
    <div>
      <nav
        aria-label={t("taking.navigatorTitle")}
        className="grid grid-cols-5 gap-2"
      >
        {questions.map((q, i) => {
          const isCurrent = i === currentIndex;
          const isFlagged = flaggedIds.has(q.id);
          const isAnswered = answeredIds.has(q.id);
          const isEssay = essayIds?.has(q.id) ?? q.type === "essay";
          return (
            <button
              key={q.id}
              type="button"
              aria-label={t("taking.navigatorLabel", { index: q.index })}
              aria-current={isCurrent ? "true" : undefined}
              onClick={() => onJump(i)}
              className={cn(
                "grid size-11 place-items-center rounded-[var(--edu-radius-btn)] text-sm font-bold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isCurrent && "bg-primary text-primary-foreground",
                !isCurrent &&
                  isFlagged &&
                  "bg-edu-warning/15 text-edu-warning-foreground",
                !isCurrent &&
                  !isFlagged &&
                  isAnswered &&
                  "bg-edu-success/15 text-edu-success-text",
                !isCurrent &&
                  !isFlagged &&
                  !isAnswered &&
                  "bg-muted text-foreground",
              )}
            >
              {isEssay ? (
                <FileText className="size-4" aria-hidden="true" />
              ) : (
                q.index
              )}
            </button>
          );
        })}
      </nav>

      <ul className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <LegendItem className="bg-primary" label={t("taking.legend.current")} />
        <LegendItem
          className="bg-edu-success/40"
          label={t("taking.legend.answered")}
        />
        <LegendItem
          className="bg-edu-warning/40"
          label={t("taking.legend.flagged")}
        />
        <LegendItem
          className="bg-muted-foreground/40"
          label={t("taking.legend.unanswered")}
        />
      </ul>
    </div>
  );
}

function LegendItem({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2">
      <span className={cn("size-3 rounded-sm", className)} aria-hidden="true" />
      {label}
    </li>
  );
}
