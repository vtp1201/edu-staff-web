import { describe, expect, it } from "vitest";
import type { ExamBankQuestion } from "../../domain/entities/exam-bank-question.entity";
import type { ExamBankSummaryDto } from "../dtos/exam-bank-list-response.dto";
import type { ExamBankQuestionDto } from "../dtos/exam-bank-question-response.dto";
import {
  mapExamBankDetail,
  mapExamBankSummary,
  mapExamStatus,
  mapQuestionToWire,
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
    questionId: "eq-uuid-1",
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
  it("maps the real questionId as the entity id (US-152 diff-sync key)", () => {
    const dto = makePaperDto({
      subjectId: "subj-9",
      questions: [
        makeQuestionDto({
          questionId: "eq-uuid-42",
          position: 3,
          body: "Q?",
          answerKey: "C",
        }),
      ],
    });
    const detail = mapExamBankDetail(dto, "Vật lý");
    expect(detail.questions).toHaveLength(1);
    const q = detail.questions[0];
    // NOT the old synthetic `q-${position}` — the server id is what the
    // diff-sync in `updateExam` matches on.
    expect(q.id).toBe("eq-uuid-42");
    expect(q.index).toBe(2);
    expect(q.content).toBe("Q?");
    expect(q.correctOptionId).toBe("C");
    expect(q.subjectId).toBe("subj-9");
  });

  it("maps options / correctOptionId / difficulty / marks / questionType faithfully", () => {
    const dto = makePaperDto({
      questions: [
        makeQuestionDto({
          options: [
            { id: "A", text: "3" },
            { id: "B", text: "4" },
          ],
          correctOptionId: "B",
          difficulty: "HARD",
          marks: 5,
          answerKey: null,
        }),
      ],
    });
    const q = mapExamBankDetail(dto, "Toán").questions[0];
    expect(q.options).toEqual([
      { id: "A", text: "3" },
      { id: "B", text: "4" },
    ]);
    expect(q.correctOptionId).toBe("B");
    expect(q.difficulty).toBe("hard");
    expect(q.marks).toBe(5);
    expect(q.questionType).toBe("MCQ");
  });

  it("defaults difficulty to medium when the wire omits it, and options to []", () => {
    const q = mapExamBankDetail(
      makePaperDto({ questions: [makeQuestionDto({ difficulty: undefined })] }),
      "Toán",
    ).questions[0];
    expect(q.difficulty).toBe("medium");
    expect(q.options).toEqual([]);
  });

  it("keeps a non-MCQ question's type and leaves its answer empty", () => {
    const q = mapExamBankDetail(
      makePaperDto({
        questions: [
          makeQuestionDto({ questionType: "ESSAY", answerKey: null }),
        ],
      }),
      "Ngữ văn",
    ).questions[0];
    expect(q.questionType).toBe("ESSAY");
    expect(q.correctOptionId).toBe("");
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

describe("mapQuestionToWire (entity → AddQuestionRequest/UpdateExamQuestionRequest)", () => {
  function question(over: Partial<ExamBankQuestion> = {}): ExamBankQuestion {
    return {
      id: "q-1",
      index: 0,
      content: "1 + 1 = ?",
      options: [
        { id: "A", text: "1" },
        { id: "B", text: "2" },
        { id: "C", text: "" },
        { id: "D", text: "" },
      ],
      correctOptionId: "B",
      difficulty: "easy",
      subjectId: "subj-1",
      ...over,
    };
  }

  it("sends the filled options only, UPPER difficulty, and mirrors answerKey", () => {
    expect(mapQuestionToWire(question())).toEqual({
      questionType: "MCQ",
      body: "1 + 1 = ?",
      marks: 1,
      options: [
        { id: "A", text: "1" },
        { id: "B", text: "2" },
      ],
      correctOptionId: "B",
      answerKey: "B",
      difficulty: "EASY",
    });
  });

  it("preserves the server's marks when the entity carries one (no silent reset)", () => {
    expect(mapQuestionToWire(question({ marks: 4 })).marks).toBe(4);
  });

  it("defaults marks to 1 when below the wire minimum or absent", () => {
    expect(mapQuestionToWire(question({ marks: 0 })).marks).toBe(1);
    expect(mapQuestionToWire(question({ marks: undefined })).marks).toBe(1);
  });

  it("omits options/correctOptionId when fewer than two are filled (option-less MCQ)", () => {
    const body = mapQuestionToWire(
      question({
        options: [
          { id: "A", text: "only" },
          { id: "B", text: "" },
          { id: "C", text: "" },
          { id: "D", text: "" },
        ],
      }),
    );
    expect(body.options).toBeUndefined();
    expect(body.correctOptionId).toBeUndefined();
    // An option-less MCQ still needs a free-text answer key server-side.
    expect(body.answerKey).toBe("B");
  });

  it("sends no options/correctOptionId/answerKey for a non-MCQ question", () => {
    const body = mapQuestionToWire(
      question({ questionType: "ESSAY", correctOptionId: "" }),
    );
    expect(body.questionType).toBe("ESSAY");
    expect(body.options).toBeUndefined();
    expect(body.correctOptionId).toBeUndefined();
    expect(body.answerKey).toBeUndefined();
  });
});
