import type { GradeApprovalBatch } from "../entities/grade-approval-batch.entity";
import type { IGradeApprovalRepository } from "../repositories/i-grade-approval.repository";

/**
 * Approve a PENDING_APPROVAL batch → PUBLISHED. State-rule enforcement lives in
 * the repository (which knows the current status); the use-case is the
 * orchestration seam (and where future cross-cutting rules would land).
 */
export class ApproveGradeBatchUseCase {
  constructor(private readonly repo: IGradeApprovalRepository) {}

  execute(batchId: string): Promise<GradeApprovalBatch> {
    return this.repo.approveGradeBatch(batchId);
  }
}
