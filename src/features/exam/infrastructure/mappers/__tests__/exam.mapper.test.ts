import { describe, expect, it } from "vitest";
import type {
  ExamQuestionDto,
  ExamResultDto,
  ExamSummaryDto,
} from "../../dtos/exam-response.dto";
import { mapExamQuestion, mapExamResult, mapExamSummary } from "../exam.mapper";

const summaryDto: ExamSummaryDto = {
  id: "exam-001",
  title: "Toán",
  subjectId: "sub-001",
  subjectName: "Toán học",
  subjectColor: "primary",
  teacherName: "An",
  description: "desc",
  durationMinutes: 45,
  totalQuestions: 20,
  deadline: "2026-06-25T23:59:00Z",
  status: "available",
  type: "multiple-choice",
};

const questionDto: ExamQuestionDto = {
  id: "q-1",
  index: 1,
  text: "Câu 1",
  options: [
    { id: "A", text: "a" },
    { id: "B", text: "b" },
  ],
};

const resultDto: ExamResultDto = {
  examId: "exam-001",
  examTitle: "Toán",
  score: 7.5,
  totalQuestions: 20,
  correctCount: 15,
  incorrectCount: 4,
  skippedCount: 1,
  timeTakenSeconds: 600,
  rank: 5,
  percentile: 80,
  passed: true,
  questionResults: [
    {
      questionId: "q-1",
      index: 1,
      text: "Câu 1",
      options: [{ id: "A", text: "a" }],
      selectedOptionId: "A",
      correctOptionId: "A",
      isCorrect: true,
    },
  ],
};

describe("exam.mapper", () => {
  it("mapExamSummary narrows union fields", () => {
    const e = mapExamSummary(summaryDto);
    expect(e.subjectColor).toBe("primary");
    expect(e.status).toBe("available");
    expect(e.type).toBe("multiple-choice");
    expect(e.durationMinutes).toBe(45);
  });

  it("mapExamQuestion copies options", () => {
    const q = mapExamQuestion(questionDto);
    expect(q.options).toHaveLength(2);
    expect(q.options[0]).toEqual({ id: "A", text: "a" });
  });

  it("mapExamResult maps nested questionResults", () => {
    const r = mapExamResult(resultDto);
    expect(r.score).toBe(7.5);
    expect(r.passed).toBe(true);
    expect(r.questionResults).toHaveLength(1);
    expect(r.questionResults[0]?.isCorrect).toBe(true);
  });
});
