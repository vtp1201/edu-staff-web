"use client";

import { AlertTriangle, CheckSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";

/**
 * Signal 1 of 2 — the teacher-editable `excused` boolean (FR-007/AC-007.1).
 * ALWAYS rendered, on every row, regardless of `state`.
 *
 * Thin wrapper over the shared `StatusBadge` (mirrors `SDStateBadge`): excused →
 * `success`, unexcused → `warning` (whose class already uses
 * `text-edu-warning-foreground`, never white — NFR-002). Icon + localized text
 * always paired, so the signal is never colour-only (NFR-001).
 */
export interface SAExcusedBadgeProps {
  excused: boolean;
}

export function SAExcusedBadge({ excused }: SAExcusedBadgeProps) {
  const t = useTranslations("studentAbsences");
  const Icon = excused ? CheckSquare : AlertTriangle;
  return (
    <StatusBadge tone={excused ? "success" : "warning"}>
      <Icon className="size-3" aria-hidden="true" />
      {t(excused ? "excused" : "unexcused")}
    </StatusBadge>
  );
}
