"use client";

import { List, type LucideIcon, PenLine, ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import type { QuestionType } from "../../domain/entities/question.entity";

export interface QBTypeBadgeProps {
  questionType: QuestionType;
}

/**
 * Question-type badge — distinct hue per type from the existing palette (no new
 * token): ESSAY→purple, SHORT_ANSWER→primary, FILL_IN→teal. Icon + label always
 * (NFR-001, never color alone). Thin wrapper over the shared `StatusBadge`.
 */
const TYPE_META: Record<QuestionType, { tone: StatusTone; icon: LucideIcon }> =
  {
    ESSAY: { tone: "purple", icon: ScrollText },
    SHORT_ANSWER: { tone: "primary", icon: PenLine },
    FILL_IN: { tone: "teal", icon: List },
  };

export function QBTypeBadge({ questionType }: QBTypeBadgeProps) {
  const t = useTranslations("questionBank.questionType");
  const { tone, icon: Icon } = TYPE_META[questionType];
  return (
    <StatusBadge tone={tone}>
      <Icon className="size-3" aria-hidden="true" />
      {t(questionType)}
    </StatusBadge>
  );
}
