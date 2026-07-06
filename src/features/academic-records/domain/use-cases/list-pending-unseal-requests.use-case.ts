import type { UnsealRequest } from "../entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../repositories/i-academic-records-seal.repository";

/** Query use-case (AC-8 pending-list model): all PENDING unseal requests. */
export class ListPendingUnsealRequestsUseCase {
  constructor(private readonly repo: IAcademicRecordsSealRepository) {}

  execute(): Promise<SealResult<UnsealRequest[]>> {
    return this.repo.getPendingUnsealRequests();
  }
}
