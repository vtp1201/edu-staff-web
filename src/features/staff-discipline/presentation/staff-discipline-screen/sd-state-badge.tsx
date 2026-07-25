"use client";

import { Check, Clock, PenLine, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import type { StaffApprovalState } from "../../domain/entities/staff-violation.entity";

/**
 * Shared `ApprovalTransition` state badge (both tabs). Thin wrapper over the
 * canonical `StatusBadge` — tone + icon lookup only, no new token
 * (design-spec `staffDiscipline.stateMachine.badge`).
 * NFR-001: icon + text ALWAYS paired, never color-only.
 */
const STATE_TONE: Record<StaffApprovalState, StatusTone> = {
  DRAFT: "muted",
  SUBMITTED: "warning",
  APPROVED: "success",
  REJECTED: "error",
};

const STATE_ICON = {
  DRAFT: PenLine,
  SUBMITTED: Clock,
  APPROVED: Check,
  REJECTED: X,
} as const;

const STATE_LABEL_KEY = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export interface SDStateBadgeProps {
  state: StaffApprovalState;
}

export function SDStateBadge({ state }: SDStateBadgeProps) {
  const t = useTranslations("staffDiscipline.violations.status");
  const Icon = STATE_ICON[state];
  return (
    <StatusBadge tone={STATE_TONE[state]}>
      <Icon className="size-3" aria-hidden="true" />
      {t(STATE_LABEL_KEY[state])}
    </StatusBadge>
  );
}
