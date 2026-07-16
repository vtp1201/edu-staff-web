import { describe, expect, it } from "vitest";
import { resolveContainingTermId, type TermWindow } from "./resolve-term";

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
