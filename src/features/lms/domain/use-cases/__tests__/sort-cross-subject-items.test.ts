/**
 * `sortCrossSubjectItems` (US-E24.4) — the cross-subject "Bài tập" /
 * "Bài kiểm tra" filter: every course's timeline flattened into ONE list,
 * grouped by BE state and ordered by deadline.
 *
 * Pure on purpose: no clock, no re-derivation of `state` (BE owns it —
 * design-spec `statusSource` forbids recomputing it client-side), so the whole
 * ordering contract is provable without a fake timer.
 */
import { describe, expect, it } from "vitest";
import type { CourseSummary } from "../../entities/course.entity";
import type {
  CourseItem,
  CourseItemState,
  CourseItemType,
} from "../../entities/course-item.entity";
import type { CourseTimeline } from "../fetch-course-timelines";
import { sortCrossSubjectItems } from "../sort-cross-subject-items";

function course(id: string): CourseSummary {
  return {
    id,
    classId: "cl1",
    subjectId: `s-${id}`,
    title: `Course ${id}`,
    status: "PUBLISHED",
    isDefault: true,
    createdBy: "t1",
    updatedAt: "2026-09-01T00:00:00Z",
    publishedAt: "2026-09-01T00:00:00Z",
  };
}

function item(
  id: string,
  over: {
    itemType?: CourseItemType;
    state?: CourseItemState;
    startAt?: string | null;
    dueAt?: string | null;
  } = {},
): CourseItem {
  return {
    id,
    courseId: "c1",
    itemType: over.itemType ?? "ASSIGNMENT",
    refId: id,
    title: id,
    description: null,
    url: null,
    position: 0,
    startAt: over.startAt ?? null,
    dueAt: over.dueAt ?? null,
    state: over.state ?? "OPEN",
    createdBy: "t1",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    exam: null,
  };
}

function timeline(items: CourseItem[], itemsFailed = false): CourseTimeline {
  return { course: course("c1"), items, itemsFailed };
}

const ids = (rows: { item: CourseItem }[]) => rows.map((row) => row.item.id);

describe("sortCrossSubjectItems", () => {
  it("orders OPEN by dueAt ascending, with an unknown deadline LAST", () => {
    const groups = sortCrossSubjectItems(
      [
        timeline([
          item("no-due", { dueAt: null }),
          item("late", { dueAt: "2026-09-20T00:00:00Z" }),
          item("soon", { dueAt: "2026-09-03T00:00:00Z" }),
        ]),
      ],
      "ASSIGNMENT",
    );

    expect(ids(groups.open)).toEqual(["soon", "late", "no-due"]);
    expect(groups.upcoming).toEqual([]);
    expect(groups.closed).toEqual([]);
  });

  it("orders UPCOMING by startAt ascending, with an unknown start LAST", () => {
    const groups = sortCrossSubjectItems(
      [
        timeline([
          item("later", {
            itemType: "EXAM",
            state: "UPCOMING_HIDDEN",
            startAt: "2026-10-01T00:00:00Z",
          }),
          item("unknown", {
            itemType: "EXAM",
            state: "UPCOMING_HIDDEN",
            startAt: null,
          }),
          item("sooner", {
            itemType: "EXAM",
            state: "UPCOMING_HIDDEN",
            startAt: "2026-09-10T00:00:00Z",
          }),
        ]),
      ],
      "EXAM",
    );

    expect(ids(groups.upcoming)).toEqual(["sooner", "later", "unknown"]);
    expect(groups.open).toEqual([]);
  });

  it("orders CLOSED by dueAt DESCENDING (most recent first), unknown LAST", () => {
    const groups = sortCrossSubjectItems(
      [
        timeline([
          item("old", { state: "CLOSED", dueAt: "2026-07-01T00:00:00Z" }),
          item("none", { state: "CLOSED", dueAt: null }),
          item("recent", { state: "CLOSED", dueAt: "2026-08-30T00:00:00Z" }),
        ]),
      ],
      "ASSIGNMENT",
    );

    expect(ids(groups.closed)).toEqual(["recent", "old", "none"]);
  });

  it("keeps only the requested item type — lessons and documents never leak in", () => {
    const groups = sortCrossSubjectItems(
      [
        timeline([
          item("lesson", { itemType: "LESSON" }),
          item("doc", { itemType: "DOCUMENT" }),
          item("exam", { itemType: "EXAM" }),
          item("assignment", { itemType: "ASSIGNMENT" }),
        ]),
      ],
      "EXAM",
    );

    expect(ids(groups.open)).toEqual(["exam"]);
  });

  it("carries each row's own course across the flatten (rows keep their subject)", () => {
    const groups = sortCrossSubjectItems(
      [
        { course: course("math"), items: [item("m1")], itemsFailed: false },
        { course: course("physics"), items: [item("p1")], itemsFailed: false },
      ],
      "ASSIGNMENT",
    );

    expect(groups.open.map((row) => row.course.id)).toEqual([
      "math",
      "physics",
    ]);
  });

  it("contributes NO rows from a course whose timeline read failed", () => {
    const groups = sortCrossSubjectItems(
      [timeline([item("ghost")], true), timeline([item("real")])],
      "ASSIGNMENT",
    );

    expect(ids(groups.open)).toEqual(["real"]);
  });

  it("returns three empty groups for an empty class", () => {
    expect(sortCrossSubjectItems([], "ASSIGNMENT")).toEqual({
      open: [],
      upcoming: [],
      closed: [],
    });
  });
});
