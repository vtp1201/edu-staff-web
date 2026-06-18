import { describe, expect, it } from "vitest";
import { MockExamRepository } from "../mocks/exam.mock.repository";

describe("MockExamRepository", () => {
  it("listExams returns the seeded exams", async () => {
    const repo = new MockExamRepository();
    const exams = await repo.listExams("current-student");
    expect(exams.length).toBeGreaterThan(0);
    expect(exams[0]?.id).toBe("exam-001");
    expect(exams.some((e) => e.status === "available")).toBe(true);
    expect(exams.some((e) => e.status === "completed")).toBe(true);
    expect(exams.some((e) => e.status === "expired")).toBe(true);
  });

  it("getQuestions returns the matching count", async () => {
    const repo = new MockExamRepository();
    const qs = await repo.getQuestions("exam-001");
    expect(qs).toHaveLength(20);
    expect(qs[0]?.options).toHaveLength(4);
  });

  it("getQuestions throws not-found for unknown exam", async () => {
    const repo = new MockExamRepository();
    await expect(repo.getQuestions("nope")).rejects.toThrow("not-found");
  });

  it("submitExam returns a scored result", async () => {
    const repo = new MockExamRepository();
    const result = await repo.submitExam({
      examId: "exam-001",
      answers: [],
      startedAt: 0,
    });
    expect(result.examId).toBe("exam-001");
    expect(result.totalQuestions).toBe(20);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(
      result.correctCount + result.incorrectCount + result.skippedCount,
    ).toBe(20);
  });

  it("submitExam throws not-found for unknown exam", async () => {
    const repo = new MockExamRepository();
    await expect(
      repo.submitExam({ examId: "nope", answers: [], startedAt: 0 }),
    ).rejects.toThrow("not-found");
  });

  it("getResult returns a result for any exam", async () => {
    const repo = new MockExamRepository();
    const result = await repo.getResult("exam-003");
    expect(result.examId).toBe("exam-003");
    expect(result.totalQuestions).toBe(40);
  });
});
