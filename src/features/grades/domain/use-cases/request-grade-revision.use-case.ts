import type { GradeApprovalBatch } from "../entities/grade-approval-batch.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradeApprovalRepository } from "../repositories/i-grade-approval.repository";

/** A revision note must give the teacher actionable feedback. */
export const MIN_REVISION_NOTE_LENGTH = 10;

/**
 * Request revision of a PENDING_APPROVAL batch → DRAFT (returns to teacher).
 * The note is validated here (pure domain rule) before any repo call.
 */
export class RequestGradeRevisionUseCase {
  constructor(private readonly repo: IGradeApprovalRepository) {}

  execute(batchId: string, note: string): Promise<GradeApprovalBatch> {
    if (note.trim().length < MIN_REVISION_NOTE_LENGTH) {
      const failure: GradesFailure = { type: "invalid-revision-note" };
      return Promise.reject(failure);
    }
    return this.repo.requestGradeRevision(batchId, note);
  }
}
