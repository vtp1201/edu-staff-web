/**
 * `summarizeCourse` (US-E24.2) — the card summary is DERIVED, never fetched:
 * BE publishes no per-course rollup (ask #4), so the timeline read is folded
 * into `{ openCount, nextDue }` here. `now` is injected so the "still ahead of
 * us" cut is deterministic — a `Date.now()` inside would make these tests
 * time-of-day dependent.
 */
import { describe, expect, it } from "vitest";
import type {
  CourseItem,
  CourseItemState,
} from "../../entities/course-item.entity";
import { summarizeCourse } from "../summarize-course";

const NOW = new Date("2026-09-02T08:00:00Z");

function item(
  over: Partial<CourseItem> & { id: string; state: CourseItemState },
): CourseItem {
  return {
    courseId: "c1",
    itemType: "ASSIGNMENT",
    refId: over.id,
    title: over.id,
    description: null,
    url: null,
    position: 0,
    startAt: null,
    dueAt: null,
    createdBy: "t1",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    exam: null,
    ...over,
  };
}

describe("summarizeCourse", () => {
  it("counts ONLY items BE marked OPEN", () => {
    const result = summarizeCourse(
      [
        item({ id: "a", state: "OPEN" }),
        item({ id: "b", state: "OPEN" }),
        item({ id: "c", state: "CLOSED" }),
        item({ id: "d", state: "UPCOMING_HIDDEN" }),
      ],
      NOW,
    );

    expect(result.openCount).toBe(2);
  });

  it("picks the OPEN item with the SOONEST future deadline", () => {
    const result = summarizeCourse(
      [
        item({ id: "far", state: "OPEN", dueAt: "2026-09-20T08:00:00Z" }),
        item({ id: "soon", state: "OPEN", dueAt: "2026-09-03T08:00:00Z" }),
        item({ id: "mid", state: "OPEN", dueAt: "2026-09-10T08:00:00Z" }),
      ],
      NOW,
    );

    expect(result.nextDue?.id).toBe("soon");
  });

  it("ignores OPEN items with no deadline at all", () => {
    const result = summarizeCourse(
      [
        item({ id: "nodue", state: "OPEN", dueAt: null }),
        item({ id: "due", state: "OPEN", dueAt: "2026-09-05T08:00:00Z" }),
      ],
      NOW,
    );

    expect(result.nextDue?.id).toBe("due");
    expect(result.openCount).toBe(2);
  });

  it("excludes a deadline already in the past — 'sắp đến hạn' is forward-looking", () => {
    const result = summarizeCourse(
      [item({ id: "past", state: "OPEN", dueAt: "2026-09-01T08:00:00Z" })],
      NOW,
    );

    expect(result.nextDue).toBeNull();
    expect(result.openCount).toBe(1);
  });

  it("never surfaces a CLOSED item even when its deadline is the soonest", () => {
    const result = summarizeCourse(
      [
        item({ id: "closed", state: "CLOSED", dueAt: "2026-09-02T09:00:00Z" }),
        item({ id: "open", state: "OPEN", dueAt: "2026-09-09T09:00:00Z" }),
      ],
      NOW,
    );

    expect(result.nextDue?.id).toBe("open");
  });

  it("never surfaces an UPCOMING_HIDDEN item (a student's EXAM tile) as next due", () => {
    const result = summarizeCourse(
      [
        item({
          id: "exam",
          state: "UPCOMING_HIDDEN",
          itemType: "EXAM",
          dueAt: "2026-09-02T09:00:00Z",
        }),
      ],
      NOW,
    );

    expect(result).toEqual({ openCount: 0, nextDue: null });
  });

  it("treats a deadline falling exactly on `now` as still ahead (inclusive boundary)", () => {
    const result = summarizeCourse(
      [item({ id: "edge", state: "OPEN", dueAt: NOW.toISOString() })],
      NOW,
    );

    expect(result.nextDue?.id).toBe("edge");
  });

  it("ignores an unparseable deadline instead of ranking it first", () => {
    const result = summarizeCourse(
      [
        item({ id: "junk", state: "OPEN", dueAt: "not-a-date" }),
        item({ id: "ok", state: "OPEN", dueAt: "2026-09-04T08:00:00Z" }),
      ],
      NOW,
    );

    expect(result.nextDue?.id).toBe("ok");
  });

  it("returns the empty summary for a course with no items", () => {
    expect(summarizeCourse([], NOW)).toEqual({ openCount: 0, nextDue: null });
  });
});
