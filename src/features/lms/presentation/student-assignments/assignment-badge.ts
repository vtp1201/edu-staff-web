import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Check, CheckSquare, Clock } from "lucide-react";
import type { StatusTone } from "@/components/shared/status-badge";
import type { AssignmentStatus } from "@/features/lms/domain/entities/assignment.entity";
import { isOverdue } from "@/features/lms/domain/use-cases/derive-overdue";

const MS_PER_DAY = 86_400_000;

/** Whole-day delta between two instants, counted from UTC midnight so the result
 *  is timezone-independent (deterministic in any test runner / server region). */
function utcDayDelta(fromIso: string, now: Date): number {
  const from = Math.floor(new Date(fromIso).getTime() / MS_PER_DAY);
  const to = Math.floor(now.getTime() / MS_PER_DAY);
  return from - to;
}

export interface AssignmentBadgeSpec {
  tone: StatusTone;
  icon: LucideIcon;
  /** Key under the `assignments` namespace. */
  labelKey:
    | "card.status.submitted"
    | "card.status.graded"
    | "card.daysLeft.dueToday"
    | "card.daysLeft.remaining"
    | "card.daysLeft.overdue";
  /** Interpolation values for `remaining`/`overdue` (`{days}`). */
  labelValues?: { days: number };
}

/**
 * Pure status + deadline → badge descriptor (tone/icon/labelKey). The card is a
 * dumb renderer of this. Color mapping is fixed by the design system:
 * submitted → primary, graded → success; pending: overdue → error,
 * due-today → error, ≤1d → error, ≤3d → warning, >3d → success. Always carries
 * an icon (never color-only, a11y). Uses `isOverdue` (domain) as the single
 * overdue source so the card badge and submit-click gate can't drift.
 */
export function assignmentBadge(
  status: AssignmentStatus,
  dueDate: string,
  now: Date,
): AssignmentBadgeSpec {
  if (status === "graded") {
    return {
      tone: "success",
      icon: CheckSquare,
      labelKey: "card.status.graded",
    };
  }
  if (status === "submitted") {
    return { tone: "primary", icon: Check, labelKey: "card.status.submitted" };
  }
  // pending
  if (isOverdue(status, dueDate, now)) {
    const days = Math.max(1, -utcDayDelta(dueDate, now));
    return {
      tone: "error",
      icon: AlertTriangle,
      labelKey: "card.daysLeft.overdue",
      labelValues: { days },
    };
  }
  const daysLeft = utcDayDelta(dueDate, now);
  if (daysLeft <= 0) {
    return {
      tone: "error",
      icon: AlertTriangle,
      labelKey: "card.daysLeft.dueToday",
    };
  }
  const tone: StatusTone =
    daysLeft <= 1 ? "error" : daysLeft <= 3 ? "warning" : "success";
  return {
    tone,
    icon: Clock,
    labelKey: "card.daysLeft.remaining",
    labelValues: { days: daysLeft },
  };
}
