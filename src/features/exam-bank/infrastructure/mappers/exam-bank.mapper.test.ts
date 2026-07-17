import { describe, expect, it } from "vitest";
import type { ExamBankSummaryDto } from "../dtos/exam-bank-list-response.dto";
import type { ExamBankQuestionDto } from "../dtos/exam-bank-question-response.dto";
import {
  mapExamBankDetail,
  mapExamBankSummary,
  mapExamStatus,
} from "./exam-bank.mapper";

function makePaperDto(
  overrides: Partial<ExamBankSummaryDto> = {},
): ExamBankSummaryDto {
  return {
    examPaperId: "ep-1",
    authorId: "author-uuid-1",
    subjectId: "subj-1",
    gradeLevel: "10",
    title: "Kiểm tra giữa kỳ",
    totalMarks: 10,
    durationMinutes: 45,
    status: "DRAFT",
    questions: [],
    createdAt: "2026-07-01T08:30:00Z",
    updatedAt: "2026-07-02T09:00:00Z",
    ...overrides,
  };
}

function makeQuestionDto(
  overrides: Partial<ExamBankQuestionDto> = {},
): ExamBankQuestionDto {
  return {
    position: 1,
    questionType: "MCQ",
    body: "1 + 1 = ?",
    answerKey: "B",
    marks: 2,
    ...overrides,
  };
}

describe("mapExamStatus", () => {
  it("maps wire UPPER status to the lowercase domain status", () => {
    expect(mapExamStatus("DRAFT")).toBe("draft");
    expect(mapExamStatus("PUBLISHED")).toBe("published");
    expect(mapExamStatus("CONFIDENTIAL")).toBe("confidential");
  });
});

describe("mapExamBankSummary", () => {
  it("maps wire fields, injects subjectName, and falls back teacherName to authorId", () => {
    const summary = mapExamBankSummary(makePaperDto(), "Toán");
    expect(summary.id).toBe("ep-1");
    expect(summary.subjectName).toBe("Toán");
    // No teacher display name on the wire (ask #21) → fall back to authorId.
    expect(summary.teacherId).toBe("author-uuid-1");
    expect(summary.teacherName).toBe("author-uuid-1");
    expect(summary.status).toBe("draft");
    // maxAttempts is non-persistent → defaulted.
    expect(summary.maxAttempts).toBe(1);
    // RFC3339 normalised to YYYY-MM-DD.
    expect(summary.createdAt).toBe("2026-07-01");
  });

  it("derives totalQuestions from the questions array the response carries", () => {
    const dto = makePaperDto({
      questions: [makeQuestionDto(), makeQuestionDto({ position: 2 })],
    });
    expect(mapExamBankSummary(dto, "Toán").totalQuestions).toBe(2);
  });
});

describe("mapExamBankDetail", () => {
  it("maps questions with an empty options array and answerKey → correctOptionId", () => {
    const dto = makePaperDto({
      subjectId: "subj-9",
      questions: [makeQuestionDto({ position: 3, body: "Q?", answerKey: "C" })],
    });
    const detail = mapExamBankDetail(dto, "Vật lý");
    expect(detail.questions).toHaveLength(1);
    const q = detail.questions[0];
    expect(q.id).toBe("q-3");
    expect(q.index).toBe(2);
    expect(q.content).toBe("Q?");
    expect(q.options).toEqual([]);
    expect(q.correctOptionId).toBe("C");
    expect(q.difficulty).toBe("medium");
    expect(q.subjectId).toBe("subj-9");
  });

  it("maps a null answerKey (non-MCQ / stripped) to an empty correctOptionId", () => {
    const dto = makePaperDto({
      questions: [makeQuestionDto({ questionType: "ESSAY", answerKey: null })],
    });
    expect(mapExamBankDetail(dto, "Ngữ văn").questions[0].correctOptionId).toBe(
      "",
    );
  });
});
