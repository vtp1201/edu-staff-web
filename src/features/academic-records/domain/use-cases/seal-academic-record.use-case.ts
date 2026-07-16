import type {
  SealBatchKey,
  SealBatchResult,
} from "../entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../repositories/i-academic-records-seal.repository";

/**
 * Batch-seal a (class, term, year) batch (AC-2/AC-4). US-E18.13 (ADR 0055):
 * a thin pass-through to the repo. The old client-side pre-check gates
 * (`not-all-locked`, `already-sealed` via a `getSealStatus` read) are GONE —
 * the real `POST .../academic-records/seal` performs the "all grades locked"
 * check server-side and returns a reactive `unlocked-grades-exist` (422), and
 * reseal is idempotent (capped server-side → `too-many-reseals`). The mocked
 * `getSealStatus` is now decorative-only, never a gate.
 */
export class SealAcademicRecordUseCase {
  constructor(private readonly repo: IAcademicRecordsSealRepository) {}

  execute(
    key: SealBatchKey,
    actorId: string,
  ): Promise<SealResult<SealBatchResult>> {
    return this.repo.sealBatch(key, actorId);
  }
}
