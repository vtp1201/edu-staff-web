import { describe, expect, it, vi } from "vitest";
import type { GradeApprovalBatch } from "../entities/grade-approval-batch.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradeApprovalRepository } from "../repositories/i-grade-approval.repository";
import { BulkLockBatchesUseCase } from "./bulk-lock-batches.use-case";

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

const LOCKED: GradeApprovalBatch = {
  id: "batch-002",
  className: "10A2",
  subjectName: "Ngữ văn",
  teacherName: "Trần Thị B",
  term: "HK1",
  studentCount: 28,
  status: "LOCKED",
  updatedAt: "2025-04-28T09:00:00Z",
};

describe("BulkLockBatchesUseCase", () => {
  it("locks the given batch ids on success", async () => {
    const bulkLockBatches = vi.fn().mockResolvedValue([LOCKED]);
    const useCase = new BulkLockBatchesUseCase(makeRepo({ bulkLockBatches }));

    const result = await useCase.execute(["batch-002"]);

    expect(bulkLockBatches).toHaveBeenCalledWith(["batch-002"]);
    expect(result[0]?.status).toBe("LOCKED");
  });

  it("resolves to an empty array (no-op) when no ids given, without touching the repo", async () => {
    const bulkLockBatches = vi.fn();
    const useCase = new BulkLockBatchesUseCase(makeRepo({ bulkLockBatches }));

    const result = await useCase.execute([]);

    expect(result).toEqual([]);
    expect(bulkLockBatches).not.toHaveBeenCalled();
  });

  it("propagates not-published failure from the repo", async () => {
    const failure: GradesFailure = { type: "not-published" };
    const bulkLockBatches = vi.fn().mockRejectedValue(failure);
    const useCase = new BulkLockBatchesUseCase(makeRepo({ bulkLockBatches }));

    await expect(useCase.execute(["batch-001"])).rejects.toEqual(failure);
  });
});
