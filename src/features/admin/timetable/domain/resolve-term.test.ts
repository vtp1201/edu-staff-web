import { describe, expect, it } from "vitest";
import {
  resolveContainingTermId,
  resolveNearestTermId,
  type TermWindow,
} from "./resolve-term";

const TERMS: TermWindow[] = [
  { id: "term-hk1", startDate: "2025-09-01", endDate: "2026-01-15" },
  { id: "term-hk2", startDate: "2026-01-16", endDate: "2026-05-31" },
];

describe("resolveContainingTermId", () => {
  it("returns the term whose window contains the date", () => {
    expect(resolveContainingTermId(TERMS, new Date("2025-11-20"))).toBe(
      "term-hk1",
    );
    expect(resolveContainingTermId(TERMS, new Date("2026-03-10"))).toBe(
      "term-hk2",
    );
  });

  it("is inclusive of both window boundaries", () => {
    expect(resolveContainingTermId(TERMS, new Date("2025-09-01"))).toBe(
      "term-hk1",
    );
    expect(resolveContainingTermId(TERMS, new Date("2026-01-15"))).toBe(
      "term-hk1",
    );
    expect(resolveContainingTermId(TERMS, new Date("2026-01-16"))).toBe(
      "term-hk2",
    );
  });

  it("returns null when the date is outside every term", () => {
    expect(resolveContainingTermId(TERMS, new Date("2026-08-01"))).toBeNull();
    expect(resolveContainingTermId([], new Date("2026-03-10"))).toBeNull();
  });
});

describe("resolveNearestTermId", () => {
  it("prefers the containing term", () => {
    expect(resolveNearestTermId(TERMS, new Date("2026-03-10"))).toBe(
      "term-hk2",
    );
  });

  it("falls back to the next term that has not ended (before the year starts)", () => {
    expect(resolveNearestTermId(TERMS, new Date("2025-08-09"))).toBe(
      "term-hk1",
    );
  });

  it("falls back to the next term in a gap between windows", () => {
    const gapped: TermWindow[] = [
      { id: "a", startDate: "2025-09-01", endDate: "2025-12-31" },
      { id: "b", startDate: "2026-02-01", endDate: "2026-05-31" },
    ];
    expect(resolveNearestTermId(gapped, new Date("2026-01-10"))).toBe("b");
  });

  it("falls back to the last term once the year is over", () => {
    expect(resolveNearestTermId(TERMS, new Date("2026-08-01"))).toBe(
      "term-hk2",
    );
  });

  it("returns null only when the year has no terms", () => {
    expect(resolveNearestTermId([], new Date("2026-03-10"))).toBeNull();
  });
});
