import { describe, expect, it, vi } from "vitest";
import type { GradeApprovalBatch } from "../entities/grade-approval-batch.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradeApprovalRepository } from "../repositories/i-grade-approval.repository";
import { RequestGradeRevisionUseCase } from "./request-grade-revision.use-case";

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

const DRAFTED: GradeApprovalBatch = {
  id: "batch-001",
  className: "10A1",
  subjectName: "Toán",
  teacherName: "Nguyễn Văn A",
  term: "HK1",
  studentCount: 30,
  status: "PENDING_APPROVAL",
  updatedAt: "2025-05-01T10:00:00Z",
};

describe("RequestGradeRevisionUseCase", () => {
  it("returns the batch on success with a valid note", async () => {
    const requestGradeRevision = vi.fn().mockResolvedValue(DRAFTED);
    const useCase = new RequestGradeRevisionUseCase(
      makeRepo({ requestGradeRevision }),
    );

    const result = await useCase.execute(
      "batch-001",
      "Cần xem lại điểm cuối kỳ",
    );

    expect(requestGradeRevision).toHaveBeenCalledWith(
      "batch-001",
      "Cần xem lại điểm cuối kỳ",
    );
    expect(result.id).toBe("batch-001");
  });

  it("rejects with invalid-revision-note when note shorter than 10 chars (no repo call)", async () => {
    const requestGradeRevision = vi.fn();
    const useCase = new RequestGradeRevisionUseCase(
      makeRepo({ requestGradeRevision }),
    );
    const failure: GradesFailure = { type: "invalid-revision-note" };

    await expect(useCase.execute("batch-001", "short")).rejects.toEqual(
      failure,
    );
    expect(requestGradeRevision).not.toHaveBeenCalled();
  });

  it("rejects with invalid-revision-note when note is only whitespace", async () => {
    const requestGradeRevision = vi.fn();
    const useCase = new RequestGradeRevisionUseCase(
      makeRepo({ requestGradeRevision }),
    );

    await expect(useCase.execute("batch-001", "             ")).rejects.toEqual(
      { type: "invalid-revision-note" },
    );
    expect(requestGradeRevision).not.toHaveBeenCalled();
  });

  it("propagates not-pending-approval failure from the repo", async () => {
    const failure: GradesFailure = { type: "not-pending-approval" };
    const requestGradeRevision = vi.fn().mockRejectedValue(failure);
    const useCase = new RequestGradeRevisionUseCase(
      makeRepo({ requestGradeRevision }),
    );

    await expect(
      useCase.execute("batch-001", "Cần chỉnh sửa điểm này"),
    ).rejects.toEqual(failure);
  });
});
