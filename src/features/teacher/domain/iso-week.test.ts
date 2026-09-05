import { describe, expect, it } from "vitest";
import {
  addWeeks,
  buildWeekDays,
  isoDateOf,
  parseIsoWeek,
  toIsoWeekParam,
} from "./iso-week";

/** Fixed "now": Wednesday 2026-09-02 (ISO week 2026-W36, Monday = 08-31). */
const NOW = new Date(2026, 8, 2, 10, 30);

describe("parseIsoWeek", () => {
  it("resolves a well-formed param to that week's Monday at midnight", () => {
    const monday = parseIsoWeek("2026-W36", NOW);
    expect(isoDateOf(monday)).toBe("2026-08-31");
    expect(monday.getHours()).toBe(0);
  });

  it("defaults to the current week when the param is absent", () => {
    expect(isoDateOf(parseIsoWeek(undefined, NOW))).toBe("2026-08-31");
  });

  it.each([
    "",
    "nonsense",
    "2026-W",
    "2026-W00",
    "2026-W54",
    "20xx-W12",
    "2026-12",
  ])("falls back to the current week for a malformed param (%s)", (param) => {
    expect(isoDateOf(parseIsoWeek(param, NOW))).toBe("2026-08-31");
  });

  it("never throws on hostile input", () => {
    expect(() => parseIsoWeek("../../etc/passwd", NOW)).not.toThrow();
  });

  it("resolves a Sunday 'now' to the Monday BEFORE it (ISO weeks end Sunday)", () => {
    const sunday = new Date(2026, 8, 6, 23, 0);
    expect(isoDateOf(parseIsoWeek(undefined, sunday))).toBe("2026-08-31");
  });
});

describe("toIsoWeekParam", () => {
  it("round-trips with parseIsoWeek", () => {
    for (const param of ["2026-W01", "2026-W36", "2026-W53", "2025-W52"]) {
      const monday = parseIsoWeek(param, NOW);
      expect(toIsoWeekParam(monday)).toBe(param);
    }
  });

  it("zero-pads the week number", () => {
    expect(toIsoWeekParam(parseIsoWeek("2026-W05", NOW))).toBe("2026-W05");
  });

  it("assigns an early-January Monday to the ISO year that owns it", () => {
    // 2026-01-01 is a Thursday → its Monday (2025-12-29) belongs to 2026-W01.
    expect(toIsoWeekParam(new Date(2025, 11, 29))).toBe("2026-W01");
  });
});

describe("addWeeks", () => {
  it("moves forward and backward by whole weeks", () => {
    const monday = parseIsoWeek("2026-W36", NOW);
    expect(isoDateOf(addWeeks(monday, 1))).toBe("2026-09-07");
    expect(isoDateOf(addWeeks(monday, -1))).toBe("2026-08-24");
  });

  it("crosses a year boundary without breaking the param round-trip", () => {
    const lastWeek = parseIsoWeek("2026-W53", NOW);
    expect(toIsoWeekParam(addWeeks(lastWeek, 1))).toBe("2027-W01");
  });

  it("does not mutate its input", () => {
    const monday = parseIsoWeek("2026-W36", NOW);
    addWeeks(monday, 4);
    expect(isoDateOf(monday)).toBe("2026-08-31");
  });
});

describe("buildWeekDays", () => {
  it("returns Mon–Sat (6 days, no Sunday row)", () => {
    const days = buildWeekDays(parseIsoWeek("2026-W36", NOW));
    expect(days.map(isoDateOf)).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
    ]);
  });

  it("spans a month boundary correctly", () => {
    const days = buildWeekDays(parseIsoWeek("2026-W40", NOW));
    expect(days).toHaveLength(6);
    expect(isoDateOf(days[0])).toBe("2026-09-28");
    expect(isoDateOf(days[5])).toBe("2026-10-03");
  });
});
