import { describe, expect, it } from "vitest";
import type { ExamBankQuestion } from "../entities/exam-bank-question.entity";
import {
  validateQuestion,
  validateQuestionsForPublish,
} from "./validate-questions";

function mockQuestion(
  overrides: Partial<ExamBankQuestion> = {},
): ExamBankQuestion {
  return {
    id: "q-1",
    index: 0,
    content: "2 + 2 = ?",
    options: [
      { id: "A", text: "3" },
      { id: "B", text: "4" },
      { id: "C", text: "5" },
      { id: "D", text: "6" },
    ],
    correctOptionId: "B",
    difficulty: "easy",
    subjectId: "s-math",
    ...overrides,
  };
}

describe("validateQuestion (mock builder MCQ model)", () => {
  it("passes a complete MCQ question", () => {
    expect(validateQuestion(mockQuestion())).toBeNull();
  });

  it("flags empty content", () => {
    expect(validateQuestion(mockQuestion({ content: "  " }))).toBe(
      "question-empty-content",
    );
  });

  it("flags fewer than two filled options", () => {
    expect(
      validateQuestion(
        mockQuestion({
          options: [
            { id: "A", text: "only" },
            { id: "B", text: "" },
            { id: "C", text: "" },
            { id: "D", text: "" },
          ],
        }),
      ),
    ).toBe("insufficient-options");
  });

  it("flags a missing correct answer", () => {
    expect(validateQuestion(mockQuestion({ correctOptionId: "" }))).toBe(
      "question-missing-answer",
    );
  });
});

describe("validateQuestion (real-mode data — no options array)", () => {
  it("passes when options is empty (server-validated at write time)", () => {
    // Real questions carry body + answerKey but no options model (US-E18.15).
    const realQuestion = mockQuestion({ options: [], correctOptionId: "B" });
    expect(validateQuestion(realQuestion)).toBeNull();
  });

  it("passes a real non-MCQ question with no answer and no options", () => {
    const essay = mockQuestion({
      content: "Explain gravity.",
      options: [],
      correctOptionId: "",
    });
    expect(validateQuestion(essay)).toBeNull();
  });

  it("still flags empty content even without options", () => {
    expect(validateQuestion(mockQuestion({ content: "", options: [] }))).toBe(
      "question-empty-content",
    );
  });
});

describe("validateQuestionsForPublish", () => {
  it("blocks an empty exam with no-questions", () => {
    expect(validateQuestionsForPublish([])).toEqual({ type: "no-questions" });
  });

  it("passes a paper of real (option-less) questions", () => {
    const questions = [
      mockQuestion({ id: "q-1", options: [], correctOptionId: "A" }),
      mockQuestion({ id: "q-2", options: [], correctOptionId: "" }),
    ];
    expect(validateQuestionsForPublish(questions)).toBeNull();
  });
});
