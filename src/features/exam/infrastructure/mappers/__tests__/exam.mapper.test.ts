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
    expect(r.status).toBe("completed");
    expect(r.questionResults).toHaveLength(1);
    expect(r.questionResults[0]?.isCorrect).toBe(true);
  });

  it("mapExamResult defaults missing status to completed", () => {
    const r = mapExamResult({ ...resultDto, status: undefined });
    expect(r.status).toBe("completed");
  });

  it("mapExamResult handles submitted_pending_essay (null score/passed)", () => {
    const dto: ExamResultDto = {
      ...resultDto,
      status: "submitted_pending_essay",
      score: null,
      passed: null,
      mcqScore: 6.25,
      mcqMax: 6,
      essayMax: 4,
      essayCount: 3,
    };
    const r = mapExamResult(dto);
    expect(r.status).toBe("submitted_pending_essay");
    expect(r.score).toBeNull();
    expect(r.passed).toBeNull();
    expect(r.mcqScore).toBe(6.25);
    expect(r.essayCount).toBe(3);
  });

  it("mapExamSummary passes through essay aggregate fields", () => {
    const e = mapExamSummary({
      ...summaryDto,
      hasEssayQuestions: true,
      essayCount: 3,
      essayMax: 4,
      mcqScore: 6.25,
      mcqMax: 6,
      questionTypes: ["mcq", "essay"],
    });
    expect(e.hasEssayQuestions).toBe(true);
    expect(e.essayCount).toBe(3);
    expect(e.questionTypes).toEqual(["mcq", "essay"]);
  });

  it("mapExamQuestion normalizes essay type", () => {
    expect(mapExamQuestion({ ...questionDto, type: "essay" }).type).toBe(
      "essay",
    );
    expect(mapExamQuestion({ ...questionDto, type: "mcq" }).type).toBe("mcq");
    expect(mapExamQuestion(questionDto).type).toBe("mcq");
  });

  it("mapQuestionResult handles essay (null correctOptionId + isCorrect)", () => {
    const r = mapExamResult({
      ...resultDto,
      questionResults: [
        {
          questionId: "e-1",
          index: 2,
          text: "Essay",
          type: "essay",
          options: [],
          selectedOptionId: null,
          correctOptionId: null,
          isCorrect: null,
          textAnswer: "student answer",
        },
      ],
    });
    const q = r.questionResults[0];
    expect(q?.type).toBe("essay");
    expect(q?.correctOptionId).toBeNull();
    expect(q?.isCorrect).toBeNull();
    expect(q?.textAnswer).toBe("student answer");
  });
});
