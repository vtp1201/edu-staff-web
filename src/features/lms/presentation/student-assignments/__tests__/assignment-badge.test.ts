import { AlertTriangle, CalendarOff, Clock } from "lucide-react";
import { describe, expect, it } from "vitest";
import { assignmentBadge } from "../assignment-badge";

// Fixed "now" at UTC midnight so day deltas are exact.
const NOW = new Date("2026-07-15T00:00:00.000Z");
const iso = (days: number) =>
  new Date(NOW.getTime() + days * 86_400_000).toISOString();

/**
 * US-E24.1: the badge is DEADLINE-ONLY. There is no submitted/graded branch to
 * test any more because the class-scoped list row carries no per-student status
 * and grading does not exist on the wire.
 */
describe("assignmentBadge", () => {
  it("no deadline → muted + CalendarOff (never 'overdue')", () => {
    expect(assignmentBadge(null, NOW)).toMatchObject({
      tone: "muted",
      icon: CalendarOff,
      labelKey: "card.daysLeft.noDeadline",
    });
  });

  it("overdue → error + AlertTriangle + overdue key with day count", () => {
    expect(assignmentBadge(iso(-4), NOW)).toMatchObject({
      tone: "error",
      icon: AlertTriangle,
      labelKey: "card.daysLeft.overdue",
      labelValues: { days: 4 },
    });
  });

  it("due today → error + AlertTriangle + dueToday key", () => {
    expect(assignmentBadge(iso(0), NOW)).toMatchObject({
      tone: "error",
      icon: AlertTriangle,
      labelKey: "card.daysLeft.dueToday",
    });
  });

  it("≤1 day left → error + Clock + remaining key", () => {
    expect(assignmentBadge(iso(1), NOW)).toMatchObject({
      tone: "error",
      icon: Clock,
      labelKey: "card.daysLeft.remaining",
      labelValues: { days: 1 },
    });
  });

  it("≤3 days left → warning", () => {
    expect(assignmentBadge(iso(2), NOW).tone).toBe("warning");
    expect(assignmentBadge(iso(3), NOW).tone).toBe("warning");
  });

  it(">3 days left → success", () => {
    expect(assignmentBadge(iso(5), NOW)).toMatchObject({
      tone: "success",
      labelValues: { days: 5 },
    });
  });

  it("never reports 0 overdue days for a just-passed deadline", () => {
    // Same UTC day but already past → still 'overdue', floored at 1 day.
    const justPassed = new Date(NOW.getTime() - 60_000).toISOString();
    expect(assignmentBadge(justPassed, NOW)).toMatchObject({
      labelKey: "card.daysLeft.overdue",
      labelValues: { days: 1 },
    });
  });
});
