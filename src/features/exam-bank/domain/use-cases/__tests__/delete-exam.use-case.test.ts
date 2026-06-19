import { describe, expect, it, vi } from "vitest";
import type { ExamBankDetail } from "../../entities/exam-bank-detail.entity";
import type { ExamBankStatus } from "../../entities/exam-bank-summary.entity";
import type { IExamBankRepository } from "../../repositories/i-exam-bank.repository";
import { DeleteExamUseCase } from "../delete-exam.use-case";

function makeDetail(status: ExamBankStatus): ExamBankDetail {
  return {
    id: "e-1",
    title: "Test exam",
    subjectId: "s-math",
    subjectName: "Toán",
    teacherId: "u-teacher-1",
    teacherName: "GV A",
    totalQuestions: 0,
    durationMinutes: 45,
    maxAttempts: 1,
    status,
    createdAt: "2026-06-01",
    questions: [],
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
    publishExam: vi.fn(),
    deleteExam: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("DeleteExamUseCase", () => {
  it("ok — deletes a draft exam", async () => {
    const repo = makeRepo(makeDetail("draft"));
    const uc = new DeleteExamUseCase(repo);
    const result = await uc.execute("e-1");
    expect(result.ok).toBe(true);
    expect(repo.deleteExam).toHaveBeenCalledWith("e-1");
  });

  it("cannot-delete-published — rejects a published exam", async () => {
    const repo = makeRepo(makeDetail("published"));
    const uc = new DeleteExamUseCase(repo);
    const result = await uc.execute("e-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("cannot-delete-published");
    expect(repo.deleteExam).not.toHaveBeenCalled();
  });
});
