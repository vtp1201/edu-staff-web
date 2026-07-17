import { describe, expect, it } from "vitest";
import type {
  CreateQuestionInput,
  QuestionType,
} from "../../entities/question.entity";
import { validateWriteInput } from "../validate-question";

const valid: CreateQuestionInput = {
  questionType: "ESSAY",
  subjectId: "sub-math",
  gradeLevel: "11",
  difficulty: "MEDIUM",
  body: "Một câu hỏi hợp lệ",
};

describe("validateWriteInput (FR-008 client-parity guards)", () => {
  it("passes a valid input (null = no failure)", () => {
    expect(validateWriteInput(valid)).toBeNull();
  });

  it("blocks an empty/whitespace body with body-required", () => {
    expect(validateWriteInput({ ...valid, body: "   " })).toEqual({
      type: "body-required",
    });
  });

  it("allows a minimal body (BE has no client-side min; that gate lives in the builder)", () => {
    expect(validateWriteInput({ ...valid, body: "a" })).toBeNull();
  });

  it("blocks a >5000-char body with body-too-long", () => {
    expect(validateWriteInput({ ...valid, body: "x".repeat(5001) })).toEqual({
      type: "body-too-long",
    });
  });

  it("blocks >10 tags with tag-limit-exceeded", () => {
    expect(
      validateWriteInput({
        ...valid,
        tags: Array.from({ length: 11 }, (_, i) => `t${i}`),
      }),
    ).toEqual({ type: "tag-limit-exceeded" });
  });

  it("blocks a >50-char tag with tag-too-long", () => {
    expect(validateWriteInput({ ...valid, tags: ["x".repeat(51)] })).toEqual({
      type: "tag-too-long",
    });
  });

  // FR-007 — the one rule that must NEVER regress: expectedAnswer is optional
  // for EVERY questionType, on create AND update.
  it.each([
    "ESSAY",
    "SHORT_ANSWER",
    "FILL_IN",
  ] as const)("NEVER requires expectedAnswer for questionType=%s (blank saves)", (questionType: QuestionType) => {
    expect(
      validateWriteInput({ ...valid, questionType, expectedAnswer: "" }),
    ).toBeNull();
    // update payload shape (body/expectedAnswer/tags only) — still optional
    expect(
      validateWriteInput({ body: valid.body, expectedAnswer: "" }),
    ).toBeNull();
  });
});
