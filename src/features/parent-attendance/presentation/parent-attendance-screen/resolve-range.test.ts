import { describe, expect, it } from "vitest";
import { resolveActiveChildId, resolveRangeFromParams } from "./resolve-range";

const TODAY = "2026-08-14";

describe("resolveRangeFromParams", () => {
  it("defaults to the current month when no params are given", () => {
    expect(resolveRangeFromParams({}, TODAY)).toEqual({
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
  });

  it("uses well-formed params verbatim", () => {
    expect(
      resolveRangeFromParams(
        { startDate: "2026-05-04", endDate: "2026-05-20" },
        TODAY,
      ),
    ).toEqual({ startDate: "2026-05-04", endDate: "2026-05-20" });
  });

  it("falls back per-bound for malformed values", () => {
    expect(
      resolveRangeFromParams(
        { startDate: "not-a-date", endDate: "2026-05-20" },
        TODAY,
      ),
    ).toEqual({ startDate: "2026-08-01", endDate: "2026-05-20" });

    expect(
      resolveRangeFromParams(
        { startDate: "2026-05-04", endDate: "2026-13-45" },
        TODAY,
      ),
    ).toEqual({ startDate: "2026-05-04", endDate: "2026-08-31" });
  });

  it("passes an inverted but well-formed range through (the use-case rejects it)", () => {
    expect(
      resolveRangeFromParams(
        { startDate: "2026-05-20", endDate: "2026-05-04" },
        TODAY,
      ),
    ).toEqual({ startDate: "2026-05-20", endDate: "2026-05-04" });
  });
});

describe("resolveActiveChildId", () => {
  it("defaults to the first linked child", () => {
    expect(resolveActiveChildId(["c1", "c2"], undefined)).toBe("c1");
  });

  it("honours a requested child that IS linked", () => {
    expect(resolveActiveChildId(["c1", "c2"], "c2")).toBe("c2");
  });

  it("ignores a childId the parent is not linked to", () => {
    expect(resolveActiveChildId(["c1", "c2"], "someone-elses-kid")).toBe("c1");
  });

  it("returns null when no children are linked", () => {
    expect(resolveActiveChildId([], "c1")).toBeNull();
  });
});
