import { describe, expect, it } from "vitest";
import { buildReorderedItemIds } from "../build-reordered-item-ids";
import { resolveCourseTimelineMode } from "../resolve-course-timeline-mode";
import {
  isDueAfterStart,
  isHttpsUrl,
  toIsoInstant,
  toLocalInputValue,
} from "../validate-item-window";

describe("resolveCourseTimelineMode", () => {
  it("returns teacher when the course's subject is one the teacher holds", () => {
    expect(resolveCourseTimelineMode(["s-math", "s-phys"], "s-math")).toBe(
      "teacher",
    );
  });

  it("returns readonly for a pure GVCN (no subject assignment at all)", () => {
    expect(resolveCourseTimelineMode([], "s-math")).toBe("readonly");
  });

  it("returns readonly when the teacher holds a DIFFERENT subject", () => {
    expect(resolveCourseTimelineMode(["s-lit"], "s-math")).toBe("readonly");
  });
});

describe("buildReorderedItemIds", () => {
  const ids = ["a", "b", "c", "d"];

  it("moves the first item to the end (after the last)", () => {
    expect(buildReorderedItemIds(ids, "a", "d", "after")).toEqual([
      "b",
      "c",
      "d",
      "a",
    ]);
  });

  it("moves the last item to the head (before the first)", () => {
    expect(buildReorderedItemIds(ids, "d", "a", "before")).toEqual([
      "d",
      "a",
      "b",
      "c",
    ]);
  });

  it("swaps two adjacent items", () => {
    expect(buildReorderedItemIds(ids, "b", "c", "after")).toEqual([
      "a",
      "c",
      "b",
      "d",
    ]);
  });

  it("keeps the complete set — never a partial list", () => {
    const next = buildReorderedItemIds(ids, "c", "a", "before");
    expect([...next].sort()).toEqual([...ids].sort());
    expect(next).toHaveLength(ids.length);
  });

  it("is a no-op when source and target are the same row", () => {
    expect(buildReorderedItemIds(ids, "b", "b", "before")).toEqual(ids);
  });

  it("throws for an id that is not in the current order (programmer error)", () => {
    expect(() => buildReorderedItemIds(ids, "zz", "a", "before")).toThrow(
      /unknown item id/i,
    );
    expect(() => buildReorderedItemIds(ids, "a", "zz", "before")).toThrow(
      /unknown item id/i,
    );
  });
});

describe("isDueAfterStart", () => {
  it("accepts a due strictly after the start", () => {
    expect(isDueAfterStart("2026-05-01T07:00", "2026-05-02T07:00")).toBe(true);
  });

  it("rejects an inverted window", () => {
    expect(isDueAfterStart("2026-05-03T07:00", "2026-05-02T07:00")).toBe(false);
  });

  it("rejects a zero-length window (BE rejects it too)", () => {
    expect(isDueAfterStart("2026-05-02T07:00", "2026-05-02T07:00")).toBe(false);
  });

  it("imposes no constraint when either half is blank", () => {
    expect(isDueAfterStart(null, "2026-05-02T07:00")).toBe(true);
    expect(isDueAfterStart("2026-05-02T07:00", null)).toBe(true);
    expect(isDueAfterStart(null, null)).toBe(true);
  });
});

describe("isHttpsUrl", () => {
  it.each([
    ["https://drive.google.com/file/d/1", true],
    ["http://example.com", false],
    ["javascript:alert(1)", false],
    ["data:text/html,x", false],
    ["https://user:pass@host/x", false],
    ["https://", false],
    ["", false],
    ["   ", false],
    ["example.com", false],
  ])("%s → %s", (url, expected) => {
    expect(isHttpsUrl(url)).toBe(expected);
  });
});

describe("toIsoInstant", () => {
  it("turns a blank datetime-local value into null (= no limit)", () => {
    expect(toIsoInstant("")).toBeNull();
    expect(toIsoInstant(null)).toBeNull();
  });

  it("turns a datetime-local value into an RFC3339 instant", () => {
    const iso = toIsoInstant("2026-05-02T07:00");
    expect(iso).not.toBeNull();
    expect(new Date(iso as string).getTime()).toBe(
      new Date("2026-05-02T07:00").getTime(),
    );
  });

  it("returns null for an unparseable value rather than Invalid Date", () => {
    expect(toIsoInstant("not-a-date")).toBeNull();
  });
});

describe("toLocalInputValue", () => {
  it("round-trips a datetime-local value through the ISO instant", () => {
    const local = "2026-05-02T07:30";
    expect(toLocalInputValue(toIsoInstant(local))).toBe(local);
  });

  it("renders an empty field for a null / unparseable instant", () => {
    expect(toLocalInputValue(null)).toBe("");
    expect(toLocalInputValue("nope")).toBe("");
  });
});
