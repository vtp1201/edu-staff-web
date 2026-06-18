import { describe, expect, it, vi } from "vitest";
import type { ExamBankDetail } from "../../entities/exam-bank-detail.entity";
import type { CreateExamInput } from "../../entities/exam-bank-input.entity";
import type { IExamBankRepository } from "../../repositories/i-exam-bank.repository";
import { CreateExamUseCase } from "../create-exam.use-case";

function makeInput(overrides: Partial<CreateExamInput> = {}): CreateExamInput {
  return {
    title: "New exam",
    subjectId: "s-math",
    durationMinutes: 45,
    maxAttempts: 1,
    questions: [],
    ...overrides,
  };
}

function makeRepo(
  overrides: Partial<IExamBankRepository> = {},
): IExamBankRepository {
  const detail: ExamBankDetail = {
    id: "e-new",
    title: "New exam",
    subjectId: "s-math",
    subjectName: "Toán",
    teacherId: "u-teacher-1",
    teacherName: "GV A",
    totalQuestions: 0,
    durationMinutes: 45,
    maxAttempts: 1,
    status: "draft",
    createdAt: "2026-06-01",
    questions: [],
  };
  return {
    listExamBank: vi.fn(),
    getExamDetail: vi.fn(),
    createExam: vi.fn().mockResolvedValue(detail),
    updateExam: vi.fn(),
    publishExam: vi.fn(),
    deleteExam: vi.fn(),
    ...overrides,
  };
}

describe("CreateExamUseCase", () => {
  it("ok — creates exam with non-empty title", async () => {
    const repo = makeRepo();
    const uc = new CreateExamUseCase(repo);
    const result = await uc.execute(makeInput());
    expect(result.ok).toBe(true);
    expect(repo.createExam).toHaveBeenCalled();
  });

  it("missing-title — blank title blocks create", async () => {
    const repo = makeRepo();
    const uc = new CreateExamUseCase(repo);
    const result = await uc.execute(makeInput({ title: "  " }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("missing-title");
    expect(repo.createExam).not.toHaveBeenCalled();
  });
});
