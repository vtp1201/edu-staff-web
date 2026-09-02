import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CalendarOff, Clock } from "lucide-react";
import type { StatusTone } from "@/components/shared/status-badge";
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
    | "card.daysLeft.noDeadline"
    | "card.daysLeft.dueToday"
    | "card.daysLeft.remaining"
    | "card.daysLeft.overdue";
  /** Interpolation values for `remaining`/`overdue` (`{days}`). */
  labelValues?: { days: number };
}

/**
 * Deadline → badge descriptor (tone/icon/labelKey). The card is a dumb
 * renderer of this.
 *
 * DEADLINE ONLY since US-E24.1. The old submitted/graded branches are gone:
 * the class-scoped list row (`AssignmentSummary`) carries neither a per-student
 * status nor a grade, and grading does not exist on the wire at all (BE
 * US-141). Deadline framing IS contract-sanctioned — BE states the client
 * renders lateness from `dueAt` itself.
 *
 * Color mapping follows the design system: overdue/due-today/≤1d → error,
 * ≤3d → warning, >3d → success, no deadline → muted. Always carries an icon
 * (never color-only, a11y).
 */
export function assignmentBadge(
  dueAt: string | null,
  now: Date,
): AssignmentBadgeSpec {
  if (dueAt === null) {
    return {
      tone: "muted",
      icon: CalendarOff,
      labelKey: "card.daysLeft.noDeadline",
    };
  }
  if (isOverdue(dueAt, now)) {
    const days = Math.max(1, -utcDayDelta(dueAt, now));
    return {
      tone: "error",
      icon: AlertTriangle,
      labelKey: "card.daysLeft.overdue",
      labelValues: { days },
    };
  }
  const daysLeft = utcDayDelta(dueAt, now);
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
