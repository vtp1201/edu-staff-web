import type {
  UnsealRequestStatus,
  UnsealRequestSummary,
} from "../entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../repositories/i-academic-records-seal.repository";

/**
 * Query use-case (AC-8 pending-list model) — US-E18.24: class+term-scoped and
 * cursor-paginated, matching the real
 * `GET /classes/{classId}/terms/{termId}/academic-records/unseal-requests`.
 * There is no tenant-wide unseal listing on the wire, so the caller must supply
 * the currently-selected class/term. Pure passthrough (no policy here).
 */
export class ListPendingUnsealRequestsUseCase {
  constructor(private readonly repo: IAcademicRecordsSealRepository) {}

  execute(
    classId: string,
    termId: string,
    opts?: {
      status?: UnsealRequestStatus;
      cursor?: string | null;
      limit?: number;
    },
  ): Promise<
    SealResult<{
      items: UnsealRequestSummary[];
      nextCursor: string | null;
      hasMore: boolean;
    }>
  > {
    return this.repo.getPendingUnsealRequests(classId, termId, opts);
  }
}
