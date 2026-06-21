import { describe, expect, it } from "vitest";
import {
  calculatePartialScore,
  calculateScore,
  scoreColorClass,
} from "../../calculate-score";
import type { ExamQuestion } from "../../entities/exam-question.entity";

describe("calculateScore", () => {
  it("15/20 = 7.5", () => {
    expect(calculateScore(15, 20)).toBe(7.5);
  });
  it("20/20 = 10", () => {
    expect(calculateScore(20, 20)).toBe(10);
  });
  it("0/20 = 0", () => {
    expect(calculateScore(0, 20)).toBe(0);
  });
  it("0/0 = 0 (no division by zero)", () => {
    expect(calculateScore(0, 0)).toBe(0);
  });
});

describe("calculatePartialScore", () => {
  const mcq = (id: string, index: number): ExamQuestion => ({
    id,
    index,
    type: "mcq",
    text: `Q${index}`,
    options: [
      { id: "A", text: "a" },
      { id: "B", text: "b" },
    ],
  });
  const essay = (id: string, index: number): ExamQuestion => ({
    id,
    index,
    type: "essay",
    text: `E${index}`,
    options: [],
  });

  it("returns {0,0,0} for empty questions array", () => {
    expect(calculatePartialScore([], {})).toEqual({
      mcqCorrect: 0,
      mcqTotal: 0,
      mcqScore: 0,
    });
  });

  it("counts only mcq questions (skips essay)", () => {
    const questions = [mcq("q1", 1), essay("e1", 2), mcq("q2", 3)];
    const result = calculatePartialScore(questions, {});
    expect(result.mcqTotal).toBe(2);
  });

  it("counts answered MCQ questions", () => {
    const questions = [mcq("q1", 1), mcq("q2", 2), mcq("q3", 3)];
    const answers = {
      q1: { questionId: "q1", selectedOptionId: "A" },
      q3: { questionId: "q3", selectedOptionId: "B" },
    };
    const result = calculatePartialScore(questions, answers);
    expect(result.mcqCorrect).toBe(2);
    expect(result.mcqTotal).toBe(3);
  });

  it("returns correct mcqScore via calculateScore (2/4 = 5)", () => {
    const questions = [mcq("q1", 1), mcq("q2", 2), mcq("q3", 3), mcq("q4", 4)];
    const answers = {
      q1: { questionId: "q1", selectedOptionId: "A" },
      q2: { questionId: "q2", selectedOptionId: "B" },
    };
    const result = calculatePartialScore(questions, answers);
    expect(result.mcqScore).toBe(5);
  });

  it("defaults missing type to mcq", () => {
    const noType: ExamQuestion = {
      id: "q1",
      index: 1,
      text: "Q1",
      options: [],
    };
    expect(calculatePartialScore([noType], {}).mcqTotal).toBe(1);
  });
});

describe("scoreColorClass", () => {
  it("8 → success", () => {
    expect(scoreColorClass(8)).toBe("text-edu-success-text");
  });
  it("9.5 → success", () => {
    expect(scoreColorClass(9.5)).toBe("text-edu-success-text");
  });
  it("5 → primary", () => {
    expect(scoreColorClass(5)).toBe("text-primary");
  });
  it("7.5 → primary", () => {
    expect(scoreColorClass(7.5)).toBe("text-primary");
  });
  it("4.9 → error", () => {
    expect(scoreColorClass(4.9)).toBe("text-edu-error-text");
  });
  it("0 → error", () => {
    expect(scoreColorClass(0)).toBe("text-edu-error-text");
  });
});
