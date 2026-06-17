import type { StatusTone } from "@/components/shared/status-badge";
import type { ConductGrade } from "../../domain/entities/conduct-summary.entity";
import type { LeaveStatus } from "../../domain/entities/leave-request.entity";
import type {
  ViolationSeverity,
  ViolationStatus,
} from "../../domain/entities/violation.entity";

/**
 * Severity → StatusBadge tone. "high" (Nặng) uses the dedicated edu-error-dark
 * token (ADR 0040) for a visually distinct destructive treatment; low=warning,
 * medium=error.
 */
export const SEVERITY_TONE: Record<ViolationSeverity, StatusTone> = {
  low: "warning",
  medium: "error",
  high: "error", // StatusBadge has no destructive tone; high uses bespoke class below
};

/** Left-accent bar background class per severity (token-only). */
export const SEVERITY_BAR_CLASS: Record<ViolationSeverity, string> = {
  low: "bg-edu-warning",
  medium: "bg-edu-error",
  high: "bg-edu-error-dark",
};

/** Bespoke high-severity badge class (edu-error-dark token, ADR 0040). */
export const HIGH_SEVERITY_BADGE_CLASS =
  "bg-edu-error-dark-light text-edu-error-dark";

export const VIOLATION_STATUS_TONE: Record<ViolationStatus, StatusTone> = {
  recorded: "primary",
  notified: "success",
  parent_confirmed: "success",
};

export const CONDUCT_GRADE_TONE: Record<ConductGrade, StatusTone> = {
  excellent: "success",
  good: "primary",
  average: "warning",
  poor: "error",
};

export const LEAVE_STATUS_TONE: Record<LeaveStatus, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
};

export const LEAVE_STATUS_BAR_CLASS: Record<LeaveStatus, string> = {
  pending: "bg-edu-warning",
  approved: "bg-edu-success",
  rejected: "bg-edu-error",
};

/** Conduct points → progress fill color class. */
export function pointsColorClass(points: number): string {
  if (points >= 90) return "bg-edu-success";
  if (points >= 70) return "bg-primary";
  if (points >= 50) return "bg-edu-warning";
  return "bg-edu-error";
}
