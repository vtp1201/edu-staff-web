"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { ExamBankQuestion } from "../../domain/entities/exam-bank-question.entity";
import { QuestionListItem } from "./question-list-item";

type QuestionListProps = {
  questions: ExamBankQuestion[];
  selectedIdx: number | null;
  errorIds: Set<string>;
  onSelect: (idx: number) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onAddQuestion: () => void;
};

export function QuestionList({
  questions,
  selectedIdx,
  errorIds,
  onSelect,
  onMoveUp,
  onMoveDown,
  onAddQuestion,
}: QuestionListProps) {
  const t = useTranslations("examBank");

  return (
    <div className="flex h-full flex-col gap-3">
      <ol className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {questions.map((q, idx) => (
          <QuestionListItem
            key={q.id}
            question={q}
            isSelected={selectedIdx === idx}
            isFirst={idx === 0}
            isLast={idx === questions.length - 1}
            hasError={errorIds.has(q.id)}
            onSelect={() => onSelect(idx)}
            onMoveUp={() => onMoveUp(idx)}
            onMoveDown={() => onMoveDown(idx)}
          />
        ))}
      </ol>

      <Button variant="outline" onClick={onAddQuestion} className="w-full">
        <Plus className="mr-1.5 size-4" aria-hidden="true" />
        {t("builder.addQuestion")}
      </Button>
    </div>
  );
}
