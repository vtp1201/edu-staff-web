"use client";

import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import type { StaffViolationSeverity } from "../../domain/entities/staff-violation.entity";

/**
 * Violation severity badge (violations tab only). Mapping is IDENTICAL to the
 * student-violations severity convention (design-spec
 * `violationsTab.severityBadge`): MINOR→warning, MODERATE→error,
 * SEVERE→error-dark (the existing `--edu-error-dark` token) — no new token.
 */
const SEVERITY_TONE: Record<StaffViolationSeverity, StatusTone> = {
  MINOR: "warning",
  MODERATE: "error",
  SEVERE: "error-dark",
};

const SEVERITY_ICON = {
  MINOR: Info,
  MODERATE: AlertTriangle,
  SEVERE: AlertOctagon,
} as const;

/** `staffDiscipline.violations.severity.{low,medium,high}` (already authored). */
const SEVERITY_LABEL_KEY = {
  MINOR: "low",
  MODERATE: "medium",
  SEVERE: "high",
} as const;

export interface SDSeverityBadgeProps {
  severity: StaffViolationSeverity;
}

export function SDSeverityBadge({ severity }: SDSeverityBadgeProps) {
  const t = useTranslations("staffDiscipline.violations.severity");
  const Icon = SEVERITY_ICON[severity];
  return (
    <StatusBadge tone={SEVERITY_TONE[severity]}>
      <Icon className="size-3" aria-hidden="true" />
      {t(SEVERITY_LABEL_KEY[severity])}
    </StatusBadge>
  );
}
