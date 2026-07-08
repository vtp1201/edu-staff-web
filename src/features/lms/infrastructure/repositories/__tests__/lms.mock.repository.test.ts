import { beforeEach, describe, expect, it } from "vitest";
import {
  MockLmsRepository,
  resetLmsMockStore,
} from "../mocks/lms.mock.repository";

describe("MockLmsRepository", () => {
  let repo: MockLmsRepository;

  beforeEach(() => {
    resetLmsMockStore();
    repo = new MockLmsRepository();
  });

  it("seeds the six courses with semantic tones (no raw hex)", async () => {
    const courses = await repo.listCourses("student-1");
    expect(courses).toHaveLength(6);
    expect(courses.map((c) => c.tone)).toEqual([
      "primary",
      "success",
      "warning",
      "purple",
      "teal",
      "error",
    ]);
    expect(JSON.stringify(courses)).not.toContain("#");
  });

  it("returns the chapter hierarchy for course 1 with an empty second chapter", async () => {
    const { course, chapters } = await repo.getCourseLessons("1");
    expect(course.name).toBe("Toán học");
    expect(chapters).toHaveLength(2);
    expect(chapters[0]?.lessons).toHaveLength(4);
    expect(chapters[0]?.lessons.map((l) => l.type)).toEqual([
      "video",
      "video",
      "pdf",
      "text",
    ]);
    expect(chapters[1]?.isEmpty).toBe(true);
  });

  it("returns empty chapters for an existing course with no content", async () => {
    const { chapters } = await repo.getCourseLessons("2");
    expect(chapters).toHaveLength(0);
  });

  it("throws not-found for an unknown course id", async () => {
    await expect(repo.getCourseLessons("999")).rejects.toThrow("not-found");
  });

  it("marks a lesson complete and recomputes course progress, persisting it", async () => {
    const result = await repo.markLessonComplete("l2");
    expect(result.lesson.done).toBe(true);
    // l1 + l2 done of 4 lessons => 50%
    expect(result.courseProgress).toEqual({
      done: 2,
      total: 4,
      pct: 50,
      status: "in-progress",
    });

    // Persisted in the hierarchy...
    const { chapters } = await repo.getCourseLessons("1");
    const l2 = chapters[0]?.lessons.find((l) => l.id === "l2");
    expect(l2?.done).toBe(true);

    // ...and reflected in the courses-list summary.
    const course1 = (await repo.listCourses("s")).find((c) => c.id === "1");
    expect(course1?.progress.done).toBe(2);
  });

  it("is idempotent — re-marking a done lesson stays done with no error", async () => {
    await repo.markLessonComplete("l1");
    const result = await repo.markLessonComplete("l1");
    expect(result.lesson.done).toBe(true);
  });

  it("throws not-found when marking an unknown lesson", async () => {
    await expect(repo.markLessonComplete("nope")).rejects.toThrow("not-found");
  });

  it("persists notes across calls (upsert by lessonId)", async () => {
    expect(await repo.getNote("l2")).toBeNull();
    const saved = await repo.saveNote("l2", "ghi chú của tôi");
    expect(saved.content).toBe("ghi chú của tôi");
    const reloaded = await repo.getNote("l2");
    expect(reloaded?.content).toBe("ghi chú của tôi");
  });

  it("prepends new questions (newest first) and persists them", async () => {
    const before = await repo.listQuestions("l1");
    expect(before).toHaveLength(1);
    const asked = await repo.askQuestion("l1", "Câu hỏi mới?");
    const after = await repo.listQuestions("l1");
    expect(after).toHaveLength(2);
    expect(after[0]?.id).toBe(asked.id);
    expect(after[0]?.question).toBe("Câu hỏi mới?");
    expect(after[0]?.answer).toBeNull();
  });
});
