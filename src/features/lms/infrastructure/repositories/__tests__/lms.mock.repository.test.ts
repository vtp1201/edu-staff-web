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

  describe("assignments", () => {
    it("seeds six assignments with semantic tones (no raw hex) covering every status", async () => {
      const all = await repo.listAssignments("student-1");
      expect(all).toHaveLength(6);
      expect(JSON.stringify(all)).not.toContain("#");
      const statuses = all.map((a) => a.status).sort();
      expect(statuses).toEqual([
        "graded",
        "graded",
        "graded",
        "pending",
        "pending",
        "submitted",
      ]);
      // graded-empty-comment seed preserves "" (not null).
      const emptyComment = all.find((a) => a.teacherComment === "");
      expect(emptyComment).toBeDefined();
      // graded-with-file seed carries gradedFileName.
      expect(all.some((a) => a.gradedFileName !== null)).toBe(true);
    });

    it("filters by status when a filter is given, returns all for 'all'", async () => {
      expect(await repo.listAssignments("s", "pending")).toHaveLength(2);
      expect(await repo.listAssignments("s", "submitted")).toHaveLength(1);
      expect(await repo.listAssignments("s", "graded")).toHaveLength(3);
      expect(await repo.listAssignments("s", "all")).toHaveLength(6);
    });

    it("submits a pending assignment, flipping it to submitted and persisting", async () => {
      const updated = await repo.submitAssignment("a1", {
        answerText: "Bài làm",
        fileName: "bai-lam.pdf",
        overdueConfirmed: false,
      });
      expect(updated.status).toBe("submitted");
      expect(updated.submittedAt).not.toBeNull();
      expect(updated.answerText).toBe("Bài làm");
      expect(updated.fileName).toBe("bai-lam.pdf");

      // Persisted: it now appears under the submitted filter, not pending.
      expect(await repo.listAssignments("s", "pending")).toHaveLength(1);
      expect(await repo.listAssignments("s", "submitted")).toHaveLength(2);
    });

    it("throws not-found submitting an unknown assignment id", async () => {
      await expect(
        repo.submitAssignment("nope", { overdueConfirmed: false }),
      ).rejects.toThrow("not-found");
    });

    it("throws already-submitted submitting a non-pending assignment", async () => {
      // a3 is seeded as submitted.
      await expect(
        repo.submitAssignment("a3", { overdueConfirmed: false }),
      ).rejects.toThrow("already-submitted");
    });

    it("resetLmsMockStore reseeds assignments back to pending", async () => {
      await repo.submitAssignment("a1", { overdueConfirmed: false });
      expect(await repo.listAssignments("s", "pending")).toHaveLength(1);
      resetLmsMockStore();
      const fresh = new MockLmsRepository();
      expect(await fresh.listAssignments("s", "pending")).toHaveLength(2);
    });
  });
});
