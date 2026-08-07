import "server-only";
import type { AxiosInstance } from "axios";
import { GRADES_EP } from "@/bootstrap/endpoint/grades.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type { PendingApprovalPage } from "../../domain/entities/pending-approval-batch.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import type { IPendingApprovalRepository } from "../../domain/repositories/i-pending-approval.repository";
import type { PendingApprovalBatchListDto } from "../dtos/pending-approval-batch-response.dto";
import { mapPendingApprovalBatch } from "../mappers/pending-approval-batch.mapper";

/**
 * The rollup's error set is a strict SUBSET of the per-cell taxonomy (US-186:
 * the endpoint only authorizes, decodes a cursor, and reads) — so it gets its
 * own tiny mapper instead of borrowing `grades.repository.ts`'s 11-code one,
 * which is parameterised by a `columnId`/`maxScore` this read does not have.
 */
function throwFailure(err: unknown): never {
  const code = errorCodeOf(err);
  const status = statusOf(err) ?? 0;
  let failure: GradesFailure;
  if (code === "GRADE_ENTRY_INVALID_CURSOR") {
    failure = { type: "invalid-cursor" };
  } else if (code === "GRADE_ENTRY_FORBIDDEN" || status === 403) {
    failure = { type: "forbidden" };
  } else if (code === "NETWORK_ERROR" || status >= 500) {
    failure = { type: "network-error" };
  } else {
    failure = { type: "unknown" };
  }
  throw failure;
}

/**
 * Tenant-wide pending-approval rollup (US-E18.46, BE US-186).
 *
 * Its own concrete class rather than a method on `GradesRepository`: that class
 * is constructed per class-subject-term with a resolved assessment scheme and
 * publish mode (two extra service reads) which this read has no use for, and
 * this endpoint is deliberately top-level — the tenant comes from the JWT
 * claim, never a path or query parameter.
 */
export class PendingApprovalRepository implements IPendingApprovalRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listPendingApprovalBatches(
    params: { cursor?: string; limit?: number } = {},
  ): Promise<PendingApprovalPage> {
    try {
      // `raw: true` is a CONFIG-level sibling of `params` (never nested inside
      // it) — the interceptor reads it off the request config to skip
      // unwrapping, so a misplaced flag would send `raw` as a query string and
      // strip the `meta.pagination` this list needs.
      const envelope = (await this.http.get(
        GRADES_EP.pendingApprovalBatches(),
        {
          params: { cursor: params.cursor, limit: params.limit },
          raw: true,
        },
      )) as unknown as ApiEnvelope<PendingApprovalBatchListDto>;
      const { data, pagination } = parseEnvelope(envelope);
      return {
        items: (data?.items ?? []).map(mapPendingApprovalBatch),
        nextCursor: pagination?.nextCursor ?? null,
        hasMore: pagination?.hasMore ?? false,
      };
    } catch (err) {
      throwFailure(err);
    }
  }
}
