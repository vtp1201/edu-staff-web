import type {
  SealAuditEntry,
  SealBatchKey,
} from "../entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../repositories/i-academic-records-seal.repository";

/** Query use-case (AC-6): the seal/unseal audit trail. */
export class GetSealAuditTrailUseCase {
  constructor(private readonly repo: IAcademicRecordsSealRepository) {}

  execute(
    filter?: Partial<SealBatchKey>,
  ): Promise<SealResult<SealAuditEntry[]>> {
    return this.repo.getSealAuditTrail(filter);
  }
}
