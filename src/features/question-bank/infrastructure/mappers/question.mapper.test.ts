import { describe, expect, it } from "vitest";
import type { QuestionResponseDto } from "../dtos/question-response.dto";
import { mapQuestion } from "./question.mapper";

const base: QuestionResponseDto = {
  id: "q-1",
  tenantId: "tn-1",
  authorId: "t-me",
  questionType: "ESSAY",
  subjectId: "sub-math",
  gradeLevel: "12",
  difficulty: "HARD",
  body: "Nội dung",
  expectedAnswer: "Đáp án",
  status: "PUBLISHED",
  tags: ["Chương 1"],
  publishedAt: "2026-05-18T00:00:00Z",
  createdAt: "2026-05-10T00:00:00Z",
  updatedAt: "2026-05-18T00:00:00Z",
};

describe("mapQuestion", () => {
  it("maps every field 1:1 including publishedAt/expectedAnswer when present", () => {
    expect(mapQuestion(base)).toEqual({
      id: "q-1",
      tenantId: "tn-1",
      authorId: "t-me",
      questionType: "ESSAY",
      subjectId: "sub-math",
      gradeLevel: "12",
      difficulty: "HARD",
      body: "Nội dung",
      expectedAnswer: "Đáp án",
      status: "PUBLISHED",
      tags: ["Chương 1"],
      publishedAt: "2026-05-18T00:00:00Z",
      createdAt: "2026-05-10T00:00:00Z",
      updatedAt: "2026-05-18T00:00:00Z",
    });
  });

  it("leaves publishedAt undefined when the wire omits the key (DRAFT)", () => {
    const { publishedAt: _o, ...draftDto } = { ...base, status: "DRAFT" };
    const entity = mapQuestion(draftDto as QuestionResponseDto);
    expect(entity.publishedAt).toBeUndefined();
    expect("publishedAt" in entity).toBe(true);
  });

  it("normalizes an absent expectedAnswer key to null (not '')", () => {
    const { expectedAnswer: _e, ...noAns } = base;
    const entity = mapQuestion(noAns as QuestionResponseDto);
    expect(entity.expectedAnswer).toBeNull();
  });

  it("normalizes a null / empty-string expectedAnswer to null", () => {
    expect(
      mapQuestion({ ...base, expectedAnswer: null }).expectedAnswer,
    ).toBeNull();
    expect(
      mapQuestion({ ...base, expectedAnswer: "" }).expectedAnswer,
    ).toBeNull();
  });

  it("normalizes a missing tags key to []", () => {
    const { tags: _t, ...noTags } = base;
    expect(mapQuestion(noTags as QuestionResponseDto).tags).toEqual([]);
  });
});
