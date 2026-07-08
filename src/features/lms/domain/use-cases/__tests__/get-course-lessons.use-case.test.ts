import { describe, expect, it, vi } from "vitest";
import type {
  CourseLessonsData,
  ILmsRepository,
} from "../../repositories/i-lms.repository";
import { GetCourseLessonsUseCase } from "../get-course-lessons.use-case";

function makeRepo(overrides: Partial<ILmsRepository> = {}): ILmsRepository {
  return {
    listCourses: vi.fn(),
    getCourseLessons: vi.fn(),
    markLessonComplete: vi.fn(),
    getNote: vi.fn(),
    saveNote: vi.fn(),
    listQuestions: vi.fn(),
    askQuestion: vi.fn(),
    ...overrides,
  };
}

const withContent: CourseLessonsData = {
  course: { id: "1", name: "Toán học", tone: "primary" },
  chapters: [
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
      ],
    },
  ],
};

const emptyCourse: CourseLessonsData = {
  course: { id: "2", name: "Vật Lý", tone: "success" },
  chapters: [],
};

describe("GetCourseLessonsUseCase", () => {
  it("returns ok with the chapter/lesson hierarchy for a course that has content", async () => {
    const repo = makeRepo({
      getCourseLessons: vi.fn().mockResolvedValue(withContent),
    });
    const result = await new GetCourseLessonsUseCase(repo).execute("1");

    expect(result).toEqual({ ok: true, data: withContent });
  });

  it("returns ok with empty chapters for an existing course with no uploaded content", async () => {
    const repo = makeRepo({
      getCourseLessons: vi.fn().mockResolvedValue(emptyCourse),
    });
    const result = await new GetCourseLessonsUseCase(repo).execute("2");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.chapters).toHaveLength(0);
  });

  it("maps an unknown course id to a not-found failure", async () => {
    const repo = makeRepo({
      getCourseLessons: vi.fn().mockRejectedValue(new Error("not-found")),
    });
    const result = await new GetCourseLessonsUseCase(repo).execute("999");

    expect(result).toEqual({ ok: false, failure: { type: "not-found" } });
  });
});
