import type { GradeApprovalBatch } from "../entities/grade-approval-batch.entity";
import type { IGradeApprovalRepository } from "../repositories/i-grade-approval.repository";

/**
 * Bulk-lock PUBLISHED batches → LOCKED. An empty selection is a no-op (no repo
 * round-trip). Per-batch status rules are enforced in the repository.
 */
export class BulkLockBatchesUseCase {
  constructor(private readonly repo: IGradeApprovalRepository) {}

  execute(batchIds: string[]): Promise<GradeApprovalBatch[]> {
    if (batchIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo.bulkLockBatches(batchIds);
  }
}
