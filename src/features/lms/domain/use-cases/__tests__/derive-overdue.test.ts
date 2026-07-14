import { describe, expect, it } from "vitest";
import { isOverdue } from "../derive-overdue";

const NOW = new Date("2026-07-15T12:00:00.000Z");

describe("isOverdue", () => {
  it("is true when a pending assignment's deadline has passed", () => {
    expect(isOverdue("pending", "2026-07-10T00:00:00.000Z", NOW)).toBe(true);
  });

  it("is false when a pending assignment's deadline is in the future", () => {
    expect(isOverdue("pending", "2026-07-20T00:00:00.000Z", NOW)).toBe(false);
  });

  it("is false for submitted assignments even past the deadline", () => {
    expect(isOverdue("submitted", "2026-07-10T00:00:00.000Z", NOW)).toBe(false);
  });

  it("is false for graded assignments even past the deadline (AC-1173.4)", () => {
    expect(isOverdue("graded", "2026-07-01T00:00:00.000Z", NOW)).toBe(false);
  });

  it("is false at the exact deadline instant (not strictly before)", () => {
    expect(isOverdue("pending", NOW.toISOString(), NOW)).toBe(false);
  });
});
