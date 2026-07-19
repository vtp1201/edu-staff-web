import { describe, expect, it } from "vitest";
import {
  filtersEqual,
  filterToQueryString,
  hasActiveFilter,
  parseFilterFromParams,
} from "./filter-search-params";

/**
 * UC-002 filter (de)serialization (US-E20.1, MAJOR-1). Pure round-trip proof:
 * empty values normalize so the applied filter — and its query key — stays
 * stable (an all-empty query string and `{ q: "", classId: null }` hash alike).
 */

describe("parseFilterFromParams", () => {
  it("returns the empty filter for empty params", () => {
    expect(parseFilterFromParams(new URLSearchParams())).toEqual({
      q: "",
      classId: null,
    });
  });

  it("reads q and classId", () => {
    const p = new URLSearchParams("q=khoa&classId=11A2");
    expect(parseFilterFromParams(p)).toEqual({ q: "khoa", classId: "11A2" });
  });

  it("trims q and treats a whitespace-only classId as null", () => {
    const p = new URLSearchParams("q=%20%20khoa%20%20&classId=%20%20");
    expect(parseFilterFromParams(p)).toEqual({ q: "khoa", classId: null });
  });
});

describe("filterToQueryString", () => {
  it("omits empty values", () => {
    expect(filterToQueryString({ q: "", classId: null })).toBe("");
  });

  it("serializes both fields", () => {
    expect(filterToQueryString({ q: "khoa", classId: "11A2" })).toBe(
      "q=khoa&classId=11A2",
    );
  });

  it("trims q before serializing", () => {
    expect(filterToQueryString({ q: "  khoa  ", classId: null })).toBe(
      "q=khoa",
    );
  });
});

describe("round-trip (serialize → parse)", () => {
  it("is stable for a populated filter", () => {
    const filter = { q: "khoa", classId: "11A2" };
    const parsed = parseFilterFromParams(
      new URLSearchParams(filterToQueryString(filter)),
    );
    expect(parsed).toEqual(filter);
  });
});

describe("filtersEqual", () => {
  it("treats empty-normalized filters as equal", () => {
    expect(
      filtersEqual({ q: "", classId: null }, { q: "   ", classId: null }),
    ).toBe(true);
  });

  it("distinguishes different filters", () => {
    expect(
      filtersEqual({ q: "khoa", classId: null }, { q: "vy", classId: null }),
    ).toBe(false);
  });
});

describe("hasActiveFilter", () => {
  it("is false for the empty filter", () => {
    expect(hasActiveFilter({ q: "", classId: null })).toBe(false);
    expect(hasActiveFilter({ q: "   ", classId: null })).toBe(false);
  });

  it("is true when q is set", () => {
    expect(hasActiveFilter({ q: "khoa", classId: null })).toBe(true);
  });

  it("is true when classId is set", () => {
    expect(hasActiveFilter({ q: "", classId: "11A2" })).toBe(true);
  });
});
