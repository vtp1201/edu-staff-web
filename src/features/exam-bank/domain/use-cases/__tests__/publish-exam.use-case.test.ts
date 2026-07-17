import { describe, expect, it, vi } from "vitest";
import type { ExamBankDetail } from "../../entities/exam-bank-detail.entity";
import type { ExamBankQuestion } from "../../entities/exam-bank-question.entity";
import type { IExamBankRepository } from "../../repositories/i-exam-bank.repository";
import { PublishExamUseCase } from "../publish-exam.use-case";

function makeQuestion(
  overrides: Partial<ExamBankQuestion> = {},
): ExamBankQuestion {
  return {
    id: "q-1",
    index: 0,
    content: "What is 2 + 2?",
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

function makeDetail(questions: ExamBankQuestion[]): ExamBankDetail {
  return {
    id: "e-1",
    title: "Test exam",
    subjectId: "s-math",
    subjectName: "Toán",
    teacherId: "u-teacher-1",
    teacherName: "GV A",
    totalQuestions: questions.length,
    durationMinutes: 45,
    maxAttempts: 1,
    status: "draft",
    createdAt: "2026-06-01",
    questions,
  };
}

function makeRepo(
  detail: ExamBankDetail,
  overrides: Partial<IExamBankRepository> = {},
): IExamBankRepository {
  return {
    listExamBank: vi.fn(),
    getExamDetail: vi.fn().mockResolvedValue(detail),
    createExam: vi.fn(),
    updateExam: vi.fn(),
    publishExam: vi.fn().mockResolvedValue({ ...detail, status: "published" }),
    deleteExam: vi.fn(),
    ...overrides,
  };
}

describe("PublishExamUseCase", () => {
  it("ok — publishes a valid exam (>=1 question, content, answer, >=2 options)", async () => {
    const detail = makeDetail([makeQuestion()]);
    const repo = makeRepo(detail);
    const uc = new PublishExamUseCase(repo);
    const result = await uc.execute("e-1");
    expect(result.ok).toBe(true);
    expect(repo.publishExam).toHaveBeenCalledWith("e-1");
  });

  it("no-questions — empty questions array blocks publish", async () => {
    const detail = makeDetail([]);
    const repo = makeRepo(detail);
    const uc = new PublishExamUseCase(repo);
    const result = await uc.execute("e-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("no-questions");
    expect(repo.publishExam).not.toHaveBeenCalled();
  });

  it("question-empty-content — blank content blocks publish", async () => {
    const detail = makeDetail([makeQuestion({ content: "   " })]);
    const repo = makeRepo(detail);
    const uc = new PublishExamUseCase(repo);
    const result = await uc.execute("e-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("question-empty-content");
  });

  it("question-missing-answer — empty correctOptionId blocks publish", async () => {
    const detail = makeDetail([makeQuestion({ correctOptionId: "" })]);
    const repo = makeRepo(detail);
    const uc = new PublishExamUseCase(repo);
    const result = await uc.execute("e-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("question-missing-answer");
  });

  it("insufficient-options — fewer than 2 filled options blocks publish", async () => {
    const detail = makeDetail([
      makeQuestion({
        options: [
          { id: "A", text: "only one" },
          { id: "B", text: "" },
          { id: "C", text: "" },
          { id: "D", text: "" },
        ],
      }),
    ]);
    const repo = makeRepo(detail);
    const uc = new PublishExamUseCase(repo);
    const result = await uc.execute("e-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("insufficient-options");
  });

  // QA (US-E18.15): end-to-end proof that a REAL repo error (thrown as the
  // mapped failure key by `mapExamBankApiError` → repo, per the throwing-repo
  // idiom) actually reaches the use-case's typed failure output — not just
  // that `mapRepoError`/`mapExamBankApiError` are individually unit-tested in
  // isolation. This is the seam the presentation layer's
  // `t(`errors.${result.errorKey}`)` toast depends on.
  describe("real-repo error passthrough (US-E18.15)", () => {
    it("getExamDetail throwing not-found surfaces as failure.type=not-found", async () => {
      const detail = makeDetail([makeQuestion()]);
      const repo = makeRepo(detail, {
        getExamDetail: vi.fn().mockRejectedValue(new Error("not-found")),
      });
      const uc = new PublishExamUseCase(repo);
      const result = await uc.execute("e-1");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.failure.type).toBe("not-found");
    });

    it("getExamDetail throwing forbidden surfaces as failure.type=forbidden", async () => {
      const detail = makeDetail([makeQuestion()]);
      const repo = makeRepo(detail, {
        getExamDetail: vi.fn().mockRejectedValue(new Error("forbidden")),
      });
      const uc = new PublishExamUseCase(repo);
      const result = await uc.execute("e-1");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.failure.type).toBe("forbidden");
    });

    it("publishExam throwing invalid-transition (already published/confidential) surfaces correctly", async () => {
      const detail = makeDetail([makeQuestion()]);
      const repo = makeRepo(detail, {
        publishExam: vi.fn().mockRejectedValue(new Error("invalid-transition")),
      });
      const uc = new PublishExamUseCase(repo);
      const result = await uc.execute("e-1");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.failure.type).toBe("invalid-transition");
    });

    it("publishExam throwing an unmapped message surfaces as unknown with the raw message preserved", async () => {
      const detail = makeDetail([makeQuestion()]);
      const repo = makeRepo(detail, {
        publishExam: vi.fn().mockRejectedValue(new Error("SOME_WEIRD_CODE")),
      });
      const uc = new PublishExamUseCase(repo);
      const result = await uc.execute("e-1");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.failure.type).toBe("unknown");
        expect(result.failure).toMatchObject({ message: "SOME_WEIRD_CODE" });
      }
    });
  });
});
