import { describe, expect, it } from "vitest";
import type { CourseLessonsDto } from "../../dtos/course-lessons-response.dto";
import type { CourseDto } from "../../dtos/course-response.dto";
import {
  mapColorToTone,
  mapCourseLessons,
  mapCourseSummary,
} from "../lms.mapper";

describe("mapColorToTone", () => {
  it("maps each palette hex to its semantic tone (case/whitespace-insensitive)", () => {
    expect(mapColorToTone("#5D87FF")).toBe("primary");
    expect(mapColorToTone("#13deb9")).toBe("success");
    expect(mapColorToTone(" #FFAE1F ")).toBe("warning");
    expect(mapColorToTone("#7B5EA7")).toBe("purple");
    expect(mapColorToTone("#00B8A9")).toBe("teal");
    expect(mapColorToTone("#FA896B")).toBe("error");
  });

  it("falls back to primary for an unknown color", () => {
    expect(mapColorToTone("#123456")).toBe("primary");
  });
});

describe("mapCourseSummary", () => {
  const dto: CourseDto = {
    id: "1",
    name: "Toán học",
    teacherName: "Nguyễn Thị Hương",
    color: "#5D87FF",
    lessonsDone: 18,
    lessonsTotal: 24,
    grade: 8.5,
  };

  it("maps a course DTO to a summary with tone + computed progress (no hex leaks)", () => {
    const summary = mapCourseSummary(dto);
    expect(summary).toEqual({
      id: "1",
      name: "Toán học",
      teacherName: "Nguyễn Thị Hương",
      tone: "primary",
      gradeAvg: 8.5,
      progress: { done: 18, total: 24, pct: 75, status: "in-progress" },
    });
    expect(JSON.stringify(summary)).not.toContain("#");
  });

  it("preserves a null grade", () => {
    expect(mapCourseSummary({ ...dto, grade: null }).gradeAvg).toBeNull();
  });
});

describe("mapCourseLessons", () => {
  const dto: CourseLessonsDto = {
    course: { id: "1", name: "Toán học", color: "#5D87FF" },
    chapters: [
      {
        id: "ch1",
        title: "Chương 1",
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
        ],
      },
      { id: "ch2", title: "Chương 2", lessons: [] },
    ],
  };

  it("maps the hierarchy, preserves the done flag, and flags empty chapters", () => {
    const result = mapCourseLessons(dto);

    expect(result.course).toEqual({
      id: "1",
      name: "Toán học",
      tone: "primary",
    });
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0]?.isEmpty).toBe(false);
    expect(result.chapters[0]?.lessons[0]?.done).toBe(true);
    expect(result.chapters[0]?.lessons[1]?.downloadHref).toBe("/x.pdf");
    expect(result.chapters[1]?.isEmpty).toBe(true);
    expect(result.chapters[1]?.lessons).toHaveLength(0);
  });

  it("omits type-specific fields for lessons that don't carry them", () => {
    const video = mapCourseLessons(dto).chapters[0]?.lessons[0];
    expect(video?.downloadHref).toBeUndefined();
    expect(video?.blocks).toBeUndefined();
  });
});
