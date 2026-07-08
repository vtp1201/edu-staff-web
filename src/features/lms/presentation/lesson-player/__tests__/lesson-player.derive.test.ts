import { describe, expect, it } from "vitest";
import type { ChapterEntity } from "@/features/lms/domain/entities/chapter.entity";
import {
  courseProgressOf,
  findNextLessonId,
  patchLessonDone,
  pickInitialLessonId,
  toActiveLessonVm,
} from "../lesson-player.derive";

const chapters: ChapterEntity[] = [
  {
    id: "ch1",
    title: "Chương 1",
    isEmpty: false,
    lessons: [
      {
        id: "l1",
        chapterId: "ch1",
        type: "video",
        order: 1,
        title: "Bài 1",
        durationLabel: "32 phút",
        done: true,
      },
      {
        id: "l3",
        chapterId: "ch1",
        type: "pdf",
        order: 3,
        title: "Bài 3",
        durationLabel: "12 trang",
        done: false,
        downloadHref: "/x.pdf",
      },
      {
        id: "l4",
        chapterId: "ch1",
        type: "text",
        order: 4,
        title: "Bài 4",
        durationLabel: "6 phút đọc",
        done: false,
        blocks: [{ heading: "H", paragraphs: ["p"] }],
      },
    ],
  },
  { id: "ch2", title: "Chương 2", isEmpty: true, lessons: [] },
];

describe("lesson-player derivations", () => {
  it("picks the first incomplete lesson as the initial active id", () => {
    expect(pickInitialLessonId(chapters)).toBe("l3");
  });

  it("returns null initial id when there are no lessons", () => {
    expect(pickInitialLessonId([chapters[1] as ChapterEntity])).toBeNull();
  });

  it("builds a video ActiveLessonVm carrying the chapter title", () => {
    const vm = toActiveLessonVm(chapters, "l1");
    expect(vm).toMatchObject({
      type: "video",
      id: "l1",
      chapterTitle: "Chương 1",
    });
  });

  it("builds a pdf ActiveLessonVm with a downloadHref", () => {
    const vm = toActiveLessonVm(chapters, "l3");
    expect(vm?.type).toBe("pdf");
    if (vm?.type === "pdf") expect(vm.downloadHref).toBe("/x.pdf");
  });

  it("builds a text ActiveLessonVm with blocks", () => {
    const vm = toActiveLessonVm(chapters, "l4");
    expect(vm?.type).toBe("text");
    if (vm?.type === "text") expect(vm.blocks).toHaveLength(1);
  });

  it("returns null active vm when no lesson is selected", () => {
    expect(toActiveLessonVm(chapters, null)).toBeNull();
  });

  it("finds the next lesson id and null at the end", () => {
    expect(findNextLessonId(chapters, "l1")).toBe("l3");
    expect(findNextLessonId(chapters, "l4")).toBeNull();
  });

  it("computes course progress from the hierarchy", () => {
    expect(courseProgressOf(chapters)).toEqual({
      done: 1,
      total: 3,
      pct: 33,
      status: "in-progress",
    });
  });

  it("immutably patches a lesson's done flag and recomputes progress", () => {
    const patched = patchLessonDone(chapters, "l3", true);
    expect(courseProgressOf(patched)).toMatchObject({
      done: 2,
      total: 3,
      pct: 67,
    });
    // original untouched
    expect(courseProgressOf(chapters).done).toBe(1);
  });
});
