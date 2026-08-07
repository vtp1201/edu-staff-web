import type { PendingApprovalBatch } from "../../domain/entities/pending-approval-batch.entity";
import type { PendingApprovalBatchResponseDto } from "../dtos/pending-approval-batch-response.dto";

/**
 * `PendingApprovalBatchResponse` → {@link PendingApprovalBatch} (US-E18.46).
 *
 * A 1:1 field copy on purpose — the wire shape IS the domain shape here, and
 * the mapper exists to make that an explicit, tested boundary rather than an
 * unchecked cast: it is the single place that would have to change if BE ever
 * enriched the rollup, and it structurally refuses to pass through any field
 * the contract does not define (notably a `batchId`, which does NOT exist —
 * see the entity's note).
 *
 * Deliberately NOT merged with `grade-approval-batch.mapper.ts`: that one maps
 * the permanently-mocked `batchId`-keyed dashboard fixture, a different (and
 * fictional) contract.
 */
export function mapPendingApprovalBatch(
  dto: PendingApprovalBatchResponseDto,
): PendingApprovalBatch {
  return {
    classId: dto.classId,
    subjectId: dto.subjectId,
    termId: dto.termId,
    pendingCount: dto.pendingCount,
    submittedAt: dto.submittedAt,
  };
}
