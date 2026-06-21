import { describe, expect, it } from "vitest";
import { type ExamResult, isResultFinal } from "../exam-result.entity";

const BASE: ExamResult = {
  examId: "exam-001",
  examTitle: "Test",
  status: "completed",
  score: 7.5,
  totalQuestions: 20,
  correctCount: 15,
  incorrectCount: 4,
  skippedCount: 1,
  timeTakenSeconds: 600,
  rank: 5,
  percentile: 80,
  passed: true,
  mcqScore: null,
  mcqMax: null,
  essayMax: null,
  essayCount: 0,
  questionResults: [],
};

describe("isResultFinal", () => {
  it("returns true when status is completed", () => {
    expect(isResultFinal({ ...BASE, status: "completed" })).toBe(true);
  });

  it("returns false when status is submitted_pending_essay", () => {
    expect(
      isResultFinal({
        ...BASE,
        status: "submitted_pending_essay",
        score: null,
        passed: null,
      }),
    ).toBe(false);
  });
});
