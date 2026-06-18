import type {
  BatchStatus,
  GradeApprovalBatch,
  GradeApprovalBatchDetail,
} from "../entities/grade-approval-batch.entity";

/**
 * Throwing repository (same convention as {@link IGradesRepository}): success
 * returns the value, failures throw a {@link GradesFailure}. Kept separate from
 * IGradesRepository so the approval pipeline (admin) does not depend on the
 * assessment-scheme / publish-mode the grade-entry repo needs (US-E14.4).
 */
export interface IGradeApprovalRepository {
  listApprovalBatches(
    statusFilter?: BatchStatus,
  ): Promise<GradeApprovalBatch[]>;
  getBatchDetail(batchId: string): Promise<GradeApprovalBatchDetail>;
  approveGradeBatch(batchId: string): Promise<GradeApprovalBatch>;
  requestGradeRevision(
    batchId: string,
    note: string,
  ): Promise<GradeApprovalBatch>;
  bulkLockBatches(batchIds: string[]): Promise<GradeApprovalBatch[]>;
}
