import { describe, expect, it } from "vitest";
import type { CourseItem } from "@/features/lms/domain/entities/course-item.entity";
import {
  pickInitialLessonId,
  toParagraphs,
  toTimelineItems,
} from "../lesson-player.derive";

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

describe("toTimelineItems", () => {
  it("keeps BE order verbatim (never re-sorts by position)", () => {
    const vms = toTimelineItems([
      item({ id: "b", position: 9 }),
      item({ id: "a", position: 0 }),
    ]);
    expect(vms.map((v) => v.id)).toEqual(["b", "a"]);
  });

  it("flattens only the exam fields a tile can render, and nulls otherwise", () => {
    const [lesson, exam] = toTimelineItems([
      item({ id: "l" }),
      item({
        id: "e",
        itemType: "EXAM",
        exam: {
          examId: "e",
          scheduledDate: null,
          durationMinutes: 45,
          examUrl: "https://x.test/e",
        },
      }),
    ]);
    expect(lesson.examUrl).toBeNull();
    expect(lesson.examDurationMinutes).toBeNull();
    expect(exam.examUrl).toBe("https://x.test/e");
    expect(exam.examDurationMinutes).toBe(45);
  });

  it("passes the BE state through untouched", () => {
    const [vm] = toTimelineItems([item({ state: "CLOSED", dueAt: null })]);
    // CLOSED with no dueAt would be impossible to re-derive client-side — which
    // is exactly why the client must not try.
    expect(vm.state).toBe("CLOSED");
  });
});

describe("pickInitialLessonId", () => {
  it("picks the first readable LESSON tile", () => {
    const items = toTimelineItems([
      item({ id: "d", itemType: "DOCUMENT", refId: null }),
      item({ id: "l1" }),
      item({ id: "l2" }),
    ]);
    expect(pickInitialLessonId(items)).toBe("l1");
  });

  it("skips an UPCOMING_HIDDEN lesson (a teacher read can contain one)", () => {
    const items = toTimelineItems([
      item({ id: "hidden", state: "UPCOMING_HIDDEN" }),
      item({ id: "open" }),
    ]);
    expect(pickInitialLessonId(items)).toBe("open");
  });

  it("returns null when the timeline holds no lesson at all", () => {
    const items = toTimelineItems([
      item({ id: "a", itemType: "ASSIGNMENT" }),
      item({ id: "e", itemType: "EXAM" }),
    ]);
    expect(pickInitialLessonId(items)).toBeNull();
  });

  it("returns null for an empty timeline", () => {
    expect(pickInitialLessonId([])).toBeNull();
  });
});

describe("toParagraphs", () => {
  it("splits on blank lines and trims", () => {
    expect(
      toParagraphs("Một.\n\n  Hai.  \n\n\nBa.").map((p) => p.text),
    ).toEqual(["Một.", "Hai.", "Ba."]);
  });

  it("keeps a single-line body as one paragraph", () => {
    expect(toParagraphs("Chỉ một dòng").map((p) => p.text)).toEqual([
      "Chỉ một dòng",
    ]);
  });

  it("gives repeated paragraph text distinct render keys", () => {
    const ids = toParagraphs("Giống nhau.\n\nGiống nhau.").map((p) => p.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("yields nothing for an empty/whitespace body", () => {
    expect(toParagraphs("")).toEqual([]);
    expect(toParagraphs("   \n\n  ")).toEqual([]);
  });
});
