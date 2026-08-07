import type { PendingApprovalPage } from "../entities/pending-approval-batch.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IPendingApprovalRepository } from "../repositories/i-pending-approval.repository";

function toFailure(err: unknown): GradesFailure {
  if (err && typeof err === "object" && "type" in err) {
    return err as GradesFailure;
  }
  return { type: "network-error" };
}

export interface ListPendingApprovalBatchesParams {
  cursor?: string;
  limit?: number;
}

/**
 * Tenant-wide "what is waiting on me" rollup for the ADMIN/MANAGER approver
 * screens (US-E18.46, BE US-186). Read-only discovery: it answers WHICH
 * `(classId, subjectId, termId)` tuples have pending cells, so the approver no
 * longer has to already know the tuple before opening the grade sheet.
 *
 * No client-side ordering or clamping: the server returns the page already
 * sorted oldest-`submittedAt`-first tenant-wide (a total order the client
 * cannot reconstruct from one page) and CLAMPS an out-of-range `limit` instead
 * of rejecting it — re-implementing either here could only disagree with it.
 */
export class ListPendingApprovalBatchesUseCase {
  constructor(private readonly repo: IPendingApprovalRepository) {}

  async execute(
    params: ListPendingApprovalBatchesParams = {},
  ): Promise<PendingApprovalPage | GradesFailure> {
    try {
      return await this.repo.listPendingApprovalBatches({
        cursor: params.cursor,
        limit: params.limit,
      });
    } catch (err) {
      return toFailure(err);
    }
  }
}
