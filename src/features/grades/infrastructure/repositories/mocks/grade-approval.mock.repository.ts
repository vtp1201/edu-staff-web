import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  BatchStatus,
  GradeApprovalBatch,
  GradeApprovalBatchDetail,
} from "../../../domain/entities/grade-approval-batch.entity";
import type { GradesFailure } from "../../../domain/failures/grades.failure";
import type { IGradeApprovalRepository } from "../../../domain/repositories/i-grade-approval.repository";
import { mapBatchDetail } from "../../mappers/grade-approval-batch.mapper";
import {
  MOCK_BATCH_AVERAGE,
  MOCK_BATCH_PREVIEW,
  MOCK_BATCHES,
} from "./approval-fixtures";

/**
 * Mock-first approval repository (decision 0014): instance-level mutable state
 * so each `new` resets to the seed for deterministic tests/stories. Throws the
 * same {@link GradesFailure} union the real repo maps to.
 */
export class MockGradeApprovalRepository implements IGradeApprovalRepository {
  private batches: GradeApprovalBatch[] = structuredClone(MOCK_BATCHES);

  async listApprovalBatches(
    statusFilter?: BatchStatus,
  ): Promise<GradeApprovalBatch[]> {
    await mockDelay();
    const source = statusFilter
      ? this.batches.filter((b) => b.status === statusFilter)
      : this.batches;
    return structuredClone(source);
  }

  async getBatchDetail(batchId: string): Promise<GradeApprovalBatchDetail> {
    await mockDelay();
    const batch = this.batches.find((b) => b.id === batchId);
    if (!batch) {
      const failure: GradesFailure = { type: "not-found" };
      throw failure;
    }
    return mapBatchDetail({
      ...batch,
      averageScore: MOCK_BATCH_AVERAGE[batchId] ?? null,
      previewRows: MOCK_BATCH_PREVIEW[batchId] ?? [],
    });
  }

  async approveGradeBatch(batchId: string): Promise<GradeApprovalBatch> {
    await mockDelay();
    const batch = this.batches.find((b) => b.id === batchId);
    if (!batch) {
      throw { type: "not-found" } as GradesFailure;
    }
    if (batch.status === "LOCKED") {
      throw { type: "batch-locked" } as GradesFailure;
    }
    if (batch.status !== "PENDING_APPROVAL") {
      throw { type: "not-pending-approval" } as GradesFailure;
    }
    batch.status = "PUBLISHED";
    batch.updatedAt = new Date().toISOString();
    return structuredClone(batch);
  }

  async requestGradeRevision(
    batchId: string,
    _note: string,
  ): Promise<GradeApprovalBatch> {
    await mockDelay();
    const batch = this.batches.find((b) => b.id === batchId);
    if (!batch) {
      throw { type: "not-found" } as GradesFailure;
    }
    if (batch.status !== "PENDING_APPROVAL") {
      throw { type: "not-pending-approval" } as GradesFailure;
    }
    // Returns to teacher (DRAFT) → leaves the approval queue.
    this.batches = this.batches.filter((b) => b.id !== batchId);
    return structuredClone(batch);
  }

  async bulkLockBatches(batchIds: string[]): Promise<GradeApprovalBatch[]> {
    await mockDelay();
    const results: GradeApprovalBatch[] = [];
    for (const id of batchIds) {
      const batch = this.batches.find((b) => b.id === id);
      if (!batch) {
        throw { type: "not-found" } as GradesFailure;
      }
      if (batch.status !== "PUBLISHED") {
        throw { type: "not-published" } as GradesFailure;
      }
      batch.status = "LOCKED";
      batch.updatedAt = new Date().toISOString();
      results.push(structuredClone(batch));
    }
    return results;
  }
}
