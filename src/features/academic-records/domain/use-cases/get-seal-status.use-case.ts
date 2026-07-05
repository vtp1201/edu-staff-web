import type {
  SealBatchKey,
  SealBatchStatus,
} from "../entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../repositories/i-academic-records-seal.repository";

/** Query use-case (AC-1/AC-2/AC-3): read the seal status for one batch. */
export class GetSealStatusUseCase {
  constructor(private readonly repo: IAcademicRecordsSealRepository) {}

  execute(key: SealBatchKey): Promise<SealResult<SealBatchStatus>> {
    return this.repo.getSealStatus(key);
  }
}
