import type {
  SealBatchKey,
  SealBatchStatus,
} from "../entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../repositories/i-academic-records-seal.repository";

/**
 * Bulk-seal a (class, term, year) batch (AC-2/AC-4). Enforces the two hard
 * gates in the domain before delegating to the repo:
 *  - `not-all-locked` — every underlying grade batch must be LOCKED first;
 *  - `already-sealed`  — idempotency guard against a double-seal race.
 */
export class SealAcademicRecordUseCase {
  constructor(private readonly repo: IAcademicRecordsSealRepository) {}

  async execute(
    key: SealBatchKey,
    actorId: string,
  ): Promise<SealResult<SealBatchStatus>> {
    const status = await this.repo.getSealStatus(key);
    if (!status.ok) return status;

    if (!status.data.allLocked) {
      return { ok: false, error: { type: "not-all-locked" } };
    }
    if (status.data.status === "SEALED") {
      return { ok: false, error: { type: "already-sealed" } };
    }

    return this.repo.sealBatch(key, actorId);
  }
}
