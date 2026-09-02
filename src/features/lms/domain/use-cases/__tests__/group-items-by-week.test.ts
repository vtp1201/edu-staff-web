import { describe, expect, it } from "vitest";
import type { CourseItem } from "../../entities/course-item.entity";
import { groupItemsByWeek } from "../group-items-by-week";

function item(over: Partial<CourseItem>): CourseItem {
  return {
    id: "i1",
    courseId: "c1",
    itemType: "LESSON",
    refId: "i1",
    title: "Bài 1",
    description: null,
    url: null,
    position: 0,
    startAt: null,
    dueAt: null,
    state: "OPEN",
    createdBy: "t1",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    exam: null,
    ...over,
  };
}

describe("groupItemsByWeek", () => {
  it("puts the `startAt: null` group first, then weeks ascending", () => {
    const groups = groupItemsByWeek([
      // Deliberately out of chronological order — grouping must sort.
      item({ id: "w3", startAt: "2026-05-04T07:00:00.000Z" }),
      item({ id: "always", startAt: null }),
      item({ id: "w1", startAt: "2026-04-20T07:00:00.000Z" }),
      item({ id: "w2", startAt: "2026-04-27T07:00:00.000Z" }),
    ]);

    expect(groups.map((g) => g.key)).toEqual([
      "always",
      "2026-W17",
      "2026-W18",
      "2026-W19",
    ]);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([
      ["always"],
      ["w1"],
      ["w2"],
      ["w3"],
    ]);
  });

  it("exposes Monday..Sunday boundaries as date-only ISO strings; the always group has none", () => {
    const [always, week] = groupItemsByWeek([
      item({ id: "always", startAt: null }),
      // A Saturday — the group still spans its whole ISO week.
      item({ id: "w", startAt: "2026-04-25T23:30:00.000Z" }),
    ]);

    expect(always?.weekStart).toBeNull();
    expect(always?.weekEnd).toBeNull();
    expect(week?.weekStart).toBe("2026-04-20");
    expect(week?.weekEnd).toBe("2026-04-26");
  });

  it("groups by ISO week across a year boundary (29/12 and 02/01 are one week)", () => {
    // 2026-12-28 (Mon) .. 2027-01-03 (Sun) is ISO week 2026-W53.
    const groups = groupItemsByWeek([
      item({ id: "dec", startAt: "2026-12-29T07:00:00.000Z" }),
      item({ id: "jan", startAt: "2027-01-02T07:00:00.000Z" }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.key).toBe("2026-W53");
    expect(groups[0]?.weekStart).toBe("2026-12-28");
    expect(groups[0]?.items.map((i) => i.id)).toEqual(["dec", "jan"]);
  });

  it("keeps BE order (position) inside a week and never re-sorts by any other field", () => {
    const groups = groupItemsByWeek([
      item({
        id: "b",
        position: 0,
        startAt: "2026-04-22T07:00:00.000Z",
        createdAt: "2026-09-01T00:00:00Z",
      }),
      item({
        id: "a",
        position: 1,
        startAt: "2026-04-20T07:00:00.000Z",
        createdAt: "2026-01-01T00:00:00Z",
      }),
    ]);

    // Same week, BE order preserved verbatim — not by startAt, not by createdAt.
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items.map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("does not let item state affect grouping (a CLOSED item stays in its own week)", () => {
    const groups = groupItemsByWeek([
      item({ id: "closed", state: "CLOSED", startAt: "2026-04-20T07:00:00Z" }),
      item({ id: "open", state: "OPEN", startAt: "2026-04-27T07:00:00Z" }),
    ]);

    expect(groups.map((g) => g.key)).toEqual(["2026-W17", "2026-W18"]);
  });

  it("returns [] for no items, and a single group when every item is always-open", () => {
    expect(groupItemsByWeek([])).toEqual([]);

    const groups = groupItemsByWeek([
      item({ id: "a", startAt: null }),
      item({ id: "b", startAt: null }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.key).toBe("always");
    expect(groups[0]?.items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("degrades an unparseable startAt into the always group instead of crashing", () => {
    const groups = groupItemsByWeek([
      item({ id: "junk", startAt: "not-a-date" }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.key).toBe("always");
  });
});
