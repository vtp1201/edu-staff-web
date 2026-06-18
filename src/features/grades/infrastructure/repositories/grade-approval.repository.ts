import "server-only";
import type { AxiosInstance } from "axios";
import { GRADES_EP } from "@/bootstrap/endpoint/grades.endpoint";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type {
  BatchStatus,
  GradeApprovalBatch,
  GradeApprovalBatchDetail,
} from "../../domain/entities/grade-approval-batch.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import type { IGradeApprovalRepository } from "../../domain/repositories/i-grade-approval.repository";
import type {
  GradeApprovalBatchDetailDto,
  GradeApprovalBatchDto,
} from "../dtos/grade-approval-batch-response.dto";
import {
  mapBatch,
  mapBatchDetail,
} from "../mappers/grade-approval-batch.mapper";

/** Map a normalised {@link ApiError} → grades failure union, then THROW it. */
function throwFailure(err: unknown): never {
  const code = errorCodeOf(err);
  const status = statusOf(err) ?? 0;
  let failure: GradesFailure;
  if (code === "BATCH_NOT_FOUND" || status === 404) {
    failure = { type: "not-found" };
  } else if (code === "BATCH_NOT_PENDING_APPROVAL") {
    failure = { type: "not-pending-approval" };
  } else if (code === "BATCH_NOT_PUBLISHED") {
    failure = { type: "not-published" };
  } else if (code === "BATCH_LOCKED") {
    failure = { type: "batch-locked" };
  } else if (code === "FORBIDDEN" || status === 403) {
    failure = { type: "forbidden" };
  } else if (code === "NETWORK_ERROR" || status >= 500) {
    failure = { type: "network-error" };
  } else {
    failure = { type: "unknown" };
  }
  throw failure;
}

export class GradeApprovalRepository implements IGradeApprovalRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listApprovalBatches(
    statusFilter?: BatchStatus,
  ): Promise<GradeApprovalBatch[]> {
    try {
      const url = statusFilter
        ? GRADES_EP.batches(statusFilter)
        : GRADES_EP.batches();
      const dtos = (await this.http.get(
        url,
      )) as unknown as GradeApprovalBatchDto[];
      return dtos.map(mapBatch);
    } catch (err) {
      throwFailure(err);
    }
  }

  async getBatchDetail(batchId: string): Promise<GradeApprovalBatchDetail> {
    try {
      const dto = (await this.http.get(
        GRADES_EP.batchDetail(batchId),
      )) as unknown as GradeApprovalBatchDetailDto;
      return mapBatchDetail(dto);
    } catch (err) {
      throwFailure(err);
    }
  }

  async approveGradeBatch(batchId: string): Promise<GradeApprovalBatch> {
    try {
      const dto = (await this.http.post(
        GRADES_EP.approveBatch(batchId),
      )) as unknown as GradeApprovalBatchDto;
      return mapBatch(dto);
    } catch (err) {
      throwFailure(err);
    }
  }

  async requestGradeRevision(
    batchId: string,
    note: string,
  ): Promise<GradeApprovalBatch> {
    try {
      const dto = (await this.http.post(GRADES_EP.requestRevision(batchId), {
        note,
      })) as unknown as GradeApprovalBatchDto;
      return mapBatch(dto);
    } catch (err) {
      throwFailure(err);
    }
  }

  async bulkLockBatches(batchIds: string[]): Promise<GradeApprovalBatch[]> {
    try {
      const dtos = (await this.http.post(GRADES_EP.bulkLock(), {
        batchIds,
      })) as unknown as GradeApprovalBatchDto[];
      return dtos.map(mapBatch);
    } catch (err) {
      throwFailure(err);
    }
  }
}
