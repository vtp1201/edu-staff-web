import { AlertTriangle, Check, CheckSquare, Clock } from "lucide-react";
import { describe, expect, it } from "vitest";
import { assignmentBadge } from "../assignment-badge";
import { scoreTone } from "../score-tone";

// Fixed "now" at UTC midnight so day deltas are exact.
const NOW = new Date("2026-07-15T00:00:00.000Z");
const iso = (days: number) =>
  new Date(NOW.getTime() + days * 86_400_000).toISOString();

describe("assignmentBadge", () => {
  it("graded → success + CheckSquare", () => {
    const b = assignmentBadge("graded", iso(-5), NOW);
    expect(b).toMatchObject({
      tone: "success",
      icon: CheckSquare,
      labelKey: "card.status.graded",
    });
  });

  it("submitted → primary + Check", () => {
    const b = assignmentBadge("submitted", iso(-1), NOW);
    expect(b).toMatchObject({
      tone: "primary",
      icon: Check,
      labelKey: "card.status.submitted",
    });
  });

  it("pending overdue → error + AlertTriangle + overdue key with day count", () => {
    const b = assignmentBadge("pending", iso(-4), NOW);
    expect(b).toMatchObject({
      tone: "error",
      icon: AlertTriangle,
      labelKey: "card.daysLeft.overdue",
      labelValues: { days: 4 },
    });
  });

  it("pending due today → error + AlertTriangle + dueToday key", () => {
    const b = assignmentBadge("pending", iso(0), NOW);
    expect(b).toMatchObject({
      tone: "error",
      icon: AlertTriangle,
      labelKey: "card.daysLeft.dueToday",
    });
  });

  it("pending ≤1 day left → error + Clock + remaining key", () => {
    const b = assignmentBadge("pending", iso(1), NOW);
    expect(b).toMatchObject({
      tone: "error",
      icon: Clock,
      labelKey: "card.daysLeft.remaining",
      labelValues: { days: 1 },
    });
  });

  it("pending ≤3 days left → warning", () => {
    expect(assignmentBadge("pending", iso(2), NOW).tone).toBe("warning");
    expect(assignmentBadge("pending", iso(3), NOW).tone).toBe("warning");
  });

  it("pending >3 days left → success", () => {
    const b = assignmentBadge("pending", iso(5), NOW);
    expect(b).toMatchObject({ tone: "success", labelValues: { days: 5 } });
  });
});

describe("scoreTone", () => {
  it("≥8 (of 10) → success", () => {
    expect(scoreTone(9, 10)).toBe("success");
    expect(scoreTone(8, 10)).toBe("success");
  });
  it("<5 (of 10) → error", () => {
    expect(scoreTone(4, 10)).toBe("error");
  });
  it("between → primary", () => {
    expect(scoreTone(7, 10)).toBe("primary");
    expect(scoreTone(5, 10)).toBe("primary");
  });
  it("normalizes against max", () => {
    expect(scoreTone(4, 5)).toBe("success"); // 8/10
    expect(scoreTone(2, 5)).toBe("error"); // 4/10
  });
  it("null score/max → muted", () => {
    expect(scoreTone(null, 10)).toBe("muted");
    expect(scoreTone(8, null)).toBe("muted");
    expect(scoreTone(8, 0)).toBe("muted");
  });
});
