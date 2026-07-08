import { describe, expect, it, vi } from "vitest";
import type { LessonContentEntity } from "../../entities/lesson.entity";
import type {
  ILmsRepository,
  MarkCompleteData,
} from "../../repositories/i-lms.repository";
import { MarkLessonCompleteUseCase } from "../mark-lesson-complete.use-case";

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

const lesson: LessonContentEntity = {
  id: "l1",
  chapterId: "ch1",
  type: "video",
  order: 1,
  title: "Bài 1",
  durationLabel: "32 phút",
  done: true,
};

const data: MarkCompleteData = {
  lesson,
  courseProgress: { done: 1, total: 3, pct: 33, status: "in-progress" },
};

describe("MarkLessonCompleteUseCase", () => {
  it("returns ok with updated lesson + recomputed progress on success", async () => {
    const repo = makeRepo({
      markLessonComplete: vi.fn().mockResolvedValue(data),
    });
    const result = await new MarkLessonCompleteUseCase(repo).execute("l1");

    expect(result).toEqual({ ok: true, data });
    expect(repo.markLessonComplete).toHaveBeenCalledWith("l1");
  });

  it("treats an already-done lesson as a no-op success (repo returns current state)", async () => {
    // Idempotent contract: the repo returns the unchanged done lesson, no failure.
    const repo = makeRepo({
      markLessonComplete: vi.fn().mockResolvedValue(data),
    });
    const result = await new MarkLessonCompleteUseCase(repo).execute("l1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.lesson.done).toBe(true);
  });

  it("maps a not-found lesson id to a not-found failure", async () => {
    const repo = makeRepo({
      markLessonComplete: vi.fn().mockRejectedValue(new Error("not-found")),
    });
    const result = await new MarkLessonCompleteUseCase(repo).execute("nope");

    expect(result).toEqual({ ok: false, failure: { type: "not-found" } });
  });

  it("maps an unexpected error to unknown", async () => {
    const repo = makeRepo({
      markLessonComplete: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const result = await new MarkLessonCompleteUseCase(repo).execute("l1");

    expect(result).toEqual({ ok: false, failure: { type: "unknown" } });
  });
});
