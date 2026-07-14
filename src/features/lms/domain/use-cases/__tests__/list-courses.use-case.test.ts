import { describe, expect, it, vi } from "vitest";
import type { CourseSummary } from "../../entities/course.entity";
import type { ILmsRepository } from "../../repositories/i-lms.repository";
import { ListCoursesUseCase } from "../list-courses.use-case";

function makeRepo(overrides: Partial<ILmsRepository> = {}): ILmsRepository {
  return {
    listCourses: vi.fn(),
    getCourseLessons: vi.fn(),
    markLessonComplete: vi.fn(),
    getNote: vi.fn(),
    saveNote: vi.fn(),
    listQuestions: vi.fn(),
    askQuestion: vi.fn(),
    listAssignments: vi.fn(),
    submitAssignment: vi.fn(),
    ...overrides,
  };
}

const courses: CourseSummary[] = [
  {
    id: "1",
    name: "Toán học",
    teacherName: "Nguyễn Thị Hương",
    tone: "primary",
    gradeAvg: 8.5,
    progress: { done: 18, total: 24, pct: 75, status: "in-progress" },
  },
];

describe("ListCoursesUseCase", () => {
  it("passes the studentId through and returns the full unfiltered list", async () => {
    const repo = makeRepo({ listCourses: vi.fn().mockResolvedValue(courses) });
    const result = await new ListCoursesUseCase(repo).execute("student-1");

    expect(result).toEqual(courses);
    expect(repo.listCourses).toHaveBeenCalledWith("student-1");
  });
});
