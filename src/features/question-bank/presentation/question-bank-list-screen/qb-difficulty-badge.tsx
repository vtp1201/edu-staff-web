"use client";

import { Check, Flag, type LucideIcon, Signal } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import type { Difficulty } from "../../domain/entities/question.entity";

export interface QBDifficultyBadgeProps {
  difficulty: Difficulty;
}

/**
 * Difficulty badge — reuses the EXISTING GPA-tier success/warning/error
 * convention (design-system.md §Score/performance màu), NOT a new token:
 * EASY→success, MEDIUM→warning, HARD→error. Icon + label always (NFR-001).
 * Warning tone renders `text-edu-warning-foreground` via StatusBadge (never
 * white-on-yellow).
 */
const DIFF_META: Record<Difficulty, { tone: StatusTone; icon: LucideIcon }> = {
  EASY: { tone: "success", icon: Check },
  MEDIUM: { tone: "warning", icon: Signal },
  HARD: { tone: "error", icon: Flag },
};

export function QBDifficultyBadge({ difficulty }: QBDifficultyBadgeProps) {
  const t = useTranslations("questionBank.difficulty");
  const { tone, icon: Icon } = DIFF_META[difficulty];
  return (
    <StatusBadge tone={tone}>
      <Icon className="size-3" aria-hidden="true" />
      {t(difficulty)}
    </StatusBadge>
  );
}
