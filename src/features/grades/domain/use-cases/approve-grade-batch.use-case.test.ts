import { describe, expect, it, vi } from "vitest";
import type { GradeApprovalBatch } from "../entities/grade-approval-batch.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradeApprovalRepository } from "../repositories/i-grade-approval.repository";
import { ApproveGradeBatchUseCase } from "./approve-grade-batch.use-case";

function makeRepo(
  overrides: Partial<IGradeApprovalRepository> = {},
): IGradeApprovalRepository {
  return {
    listApprovalBatches: vi.fn(),
    getBatchDetail: vi.fn(),
    approveGradeBatch: vi.fn(),
    requestGradeRevision: vi.fn(),
    bulkLockBatches: vi.fn(),
    ...overrides,
  };
}

const PUBLISHED: GradeApprovalBatch = {
  id: "batch-001",
  className: "10A1",
  subjectName: "Toán",
  teacherName: "Nguyễn Văn A",
  term: "HK1",
  studentCount: 30,
  status: "PUBLISHED",
  updatedAt: "2025-05-01T10:00:00Z",
};

describe("ApproveGradeBatchUseCase", () => {
  it("returns the published batch on success", async () => {
    const approveGradeBatch = vi.fn().mockResolvedValue(PUBLISHED);
    const useCase = new ApproveGradeBatchUseCase(
      makeRepo({ approveGradeBatch }),
    );

    const result = await useCase.execute("batch-001");

    expect(approveGradeBatch).toHaveBeenCalledWith("batch-001");
    expect(result.status).toBe("PUBLISHED");
  });

  it("propagates not-pending-approval failure from the repo", async () => {
    const failure: GradesFailure = { type: "not-pending-approval" };
    const approveGradeBatch = vi.fn().mockRejectedValue(failure);
    const useCase = new ApproveGradeBatchUseCase(
      makeRepo({ approveGradeBatch }),
    );

    await expect(useCase.execute("batch-001")).rejects.toEqual(failure);
  });

  it("propagates batch-locked failure from the repo", async () => {
    const failure: GradesFailure = { type: "batch-locked" };
    const approveGradeBatch = vi.fn().mockRejectedValue(failure);
    const useCase = new ApproveGradeBatchUseCase(
      makeRepo({ approveGradeBatch }),
    );

    await expect(useCase.execute("batch-003")).rejects.toEqual(failure);
  });
});
