import { describe, expect, it } from "vitest";
import {
  filtersEqual,
  filterToQueryString,
  parseFilterFromParams,
} from "./filter-search-params";

describe("parseFilterFromParams", () => {
  it("returns an empty filter for empty params", () => {
    expect(parseFilterFromParams(new URLSearchParams())).toEqual({});
  });

  it("parses every known field", () => {
    const params = new URLSearchParams(
      "entityType=grade&action=DELETE&actor=Quân&from=2026-06-01&to=2026-06-30",
    );
    expect(parseFilterFromParams(params)).toEqual({
      entityType: "grade",
      action: "DELETE",
      actorQuery: "Quân",
      from: "2026-06-01",
      to: "2026-06-30",
    });
  });

  it("drops unknown entity type / action values", () => {
    const params = new URLSearchParams("entityType=widget&action=NUKE");
    expect(parseFilterFromParams(params)).toEqual({});
  });

  it("trims and drops a whitespace-only actor", () => {
    expect(parseFilterFromParams(new URLSearchParams("actor=%20%20"))).toEqual(
      {},
    );
  });
});

describe("filterToQueryString", () => {
  it("omits empty values", () => {
    expect(filterToQueryString({})).toBe("");
    expect(filterToQueryString({ actorQuery: "  " })).toBe("");
  });

  it("round-trips through parse", () => {
    const filter = {
      entityType: "conduct" as const,
      action: "UPDATE" as const,
      actorQuery: "Hương",
      from: "2026-06-01",
      to: "2026-06-30",
    };
    const qs = filterToQueryString(filter);
    expect(parseFilterFromParams(new URLSearchParams(qs))).toEqual(filter);
  });
});

describe("filtersEqual", () => {
  it("treats empty and whitespace-actor filters as equal", () => {
    expect(filtersEqual({}, { actorQuery: "" })).toBe(true);
  });

  it("distinguishes different entity types", () => {
    expect(
      filtersEqual({ entityType: "grade" }, { entityType: "record" }),
    ).toBe(false);
  });
});
