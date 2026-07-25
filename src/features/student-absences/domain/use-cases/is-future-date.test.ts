import { describe, expect, it } from "vitest";
import {
  isBareCalendarDate,
  isFutureDate,
  toBareCalendarDate,
} from "./is-future-date";

/**
 * NFR-009 / FR-002 — bare-`YYYY-MM-DD` validation + future-date rejection.
 * Deterministic: `today` is always injected, never `Date.now()`
 * (`.claude/rules/tdd.md`).
 */
describe("isBareCalendarDate", () => {
  it("accepts a bare YYYY-MM-DD calendar date", () => {
    expect(isBareCalendarDate("2026-05-06")).toBe(true);
    expect(isBareCalendarDate("2026-01-01")).toBe(true);
    expect(isBareCalendarDate("2026-12-31")).toBe(true);
  });

  it("rejects a datetime, a partial date, and junk (NFR-009 — not a datetime)", () => {
    expect(isBareCalendarDate("2026-05-06T07:40:00Z")).toBe(false);
    expect(isBareCalendarDate("2026-05-06 07:40")).toBe(false);
    expect(isBareCalendarDate("2026-5-6")).toBe(false);
    expect(isBareCalendarDate("06/05/2026")).toBe(false);
    expect(isBareCalendarDate("")).toBe(false);
    expect(isBareCalendarDate("   ")).toBe(false);
  });

  it("rejects a syntactically well-formed but non-existent calendar date", () => {
    expect(isBareCalendarDate("2026-02-30")).toBe(false);
    expect(isBareCalendarDate("2026-13-01")).toBe(false);
    expect(isBareCalendarDate("2026-00-10")).toBe(false);
    expect(isBareCalendarDate("2026-04-31")).toBe(false);
  });
});

describe("isFutureDate", () => {
  const today = "2026-05-06";

  it("is false for today (today is allowed — FR-002 says ≤ today)", () => {
    expect(isFutureDate(today, today)).toBe(false);
  });

  it("is false for any past date", () => {
    expect(isFutureDate("2026-05-05", today)).toBe(false);
    expect(isFutureDate("2025-12-31", today)).toBe(false);
  });

  it("is true for tomorrow and beyond (AC-003.3)", () => {
    expect(isFutureDate("2026-05-07", today)).toBe(true);
    expect(isFutureDate("2027-01-01", today)).toBe(true);
  });

  it("compares month/year boundaries lexicographically-safely", () => {
    expect(isFutureDate("2026-06-01", today)).toBe(true);
    expect(isFutureDate("2026-04-30", today)).toBe(false);
  });

  it("treats an unparseable value as NOT future (format is a separate failure)", () => {
    // `invalid-input` (format) and `invalid-date` (future) are distinct
    // failures — this predicate must not conflate them.
    expect(isFutureDate("not-a-date", today)).toBe(false);
    expect(isFutureDate("", today)).toBe(false);
  });
});

describe("toBareCalendarDate", () => {
  it("formats a Date into a bare YYYY-MM-DD in UTC (deterministic)", () => {
    expect(toBareCalendarDate(new Date("2026-05-06T23:59:59Z"))).toBe(
      "2026-05-06",
    );
    expect(toBareCalendarDate(new Date("2026-01-02T00:00:00Z"))).toBe(
      "2026-01-02",
    );
  });
});
