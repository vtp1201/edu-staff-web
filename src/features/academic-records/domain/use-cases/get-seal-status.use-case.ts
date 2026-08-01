import type {
  SealBatchKey,
  SealStatusRollup,
} from "../entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../repositories/i-academic-records-seal.repository";

/**
 * Query use-case (AC-1/AC-2/AC-3): read the class+term seal rollup.
 *
 * US-E18.24 — now REAL (`GET .../academic-records/seal-status`). The rollup is
 * a PROACTIVE hint only: the submit-time authority stays the reactive 422 on
 * `sealBatch` (`unlocked-grades-exist` / `too-many-reseals`, ADR 0055).
 */
export class GetSealStatusUseCase {
  constructor(private readonly repo: IAcademicRecordsSealRepository) {}

  execute(key: SealBatchKey): Promise<SealResult<SealStatusRollup>> {
    return this.repo.getSealStatus(key);
  }
}
