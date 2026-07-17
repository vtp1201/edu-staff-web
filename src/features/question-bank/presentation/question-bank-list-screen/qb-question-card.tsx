"use client";

import { Eye, List, PenLine, ScrollText, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QuestionType } from "../../domain/entities/question.entity";
import { QBDifficultyBadge } from "./qb-difficulty-badge";
import { QBStatusChip } from "./qb-status-chip";
import { QBTypeBadge } from "./qb-type-badge";
import type { QBQuestionCardVM } from "./question-bank-list-screen.i-vm";

export interface QBQuestionCardProps {
  question: QBQuestionCardVM;
  onOpen: (id: string) => void;
}

const TYPE_ICON: Record<QuestionType, typeof ScrollText> = {
  ESSAY: ScrollText,
  SHORT_ANSWER: PenLine,
  FILL_IN: List,
};

/**
 * Question row card (design listScreen.rowCard — mirrors exam-bank's row
 * layout). Type/difficulty/status badges each pair icon+text (NFR-001). Author
 * attribution (scope=search only) is the pre-resolved `authorLabel` — no
 * per-card lookup (plan.md §0 decision #2). Body preview pre-truncated by the
 * screen (FR-004).
 */
export function QBQuestionCard({ question, onOpen }: QBQuestionCardProps) {
  const t = useTranslations("questionBank.card");
  const Icon = TYPE_ICON[question.questionType];

  return (
    <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex size-13 shrink-0 items-center justify-center rounded-xl bg-primary/8">
        <Icon className="size-5.5 text-primary" aria-hidden="true" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 font-bold text-foreground text-sm leading-snug">
            {question.bodyPreview}
          </p>
          <QBStatusChip status={question.status} />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-edu-text-secondary text-xs">
          <span className="font-bold text-primary">{question.subjectName}</span>
          <span aria-hidden="true">·</span>
          <span>{t("grade", { grade: question.gradeLevel })}</span>
          <span aria-hidden="true">·</span>
          <QBTypeBadge questionType={question.questionType} />
          <QBDifficultyBadge difficulty={question.difficulty} />
          {question.authorLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <User className="size-3" aria-hidden="true" />
                {question.authorLabel}
              </span>
            </>
          )}
        </div>

        {question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {question.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="rounded-full px-2 py-0.5 font-bold text-[10px]"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-1 border-border border-t pt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpen(question.id)}
            aria-label={`${question.isMine ? t("edit") : t("view")}: ${question.bodyPreview}`}
          >
            {question.isMine ? (
              <PenLine className="mr-1.5 size-3.5" aria-hidden="true" />
            ) : (
              <Eye className="mr-1.5 size-3.5" aria-hidden="true" />
            )}
            {question.isMine ? t("edit") : t("view")}
          </Button>
        </div>
      </div>
    </div>
  );
}
