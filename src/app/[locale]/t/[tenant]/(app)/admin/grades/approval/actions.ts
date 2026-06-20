"use server";

import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeApproveGradeBatchUseCase,
  makeBulkLockBatchesUseCase,
  makeGradeApprovalRepository,
  makeRequestGradeRevisionUseCase,
} from "@/bootstrap/di/grades.di";
import type {
  BatchStatus,
  GradeApprovalBatch,
  GradeApprovalBatchDetail,
} from "@/features/grades/domain/entities/grade-approval-batch.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; errorKey: GradesFailure["type"] };
type Result<T> = Ok<T> | Err;

/** Narrow an unknown caught throw to a GradesFailure key (default: unknown). */
function toErrorKey(err: unknown): GradesFailure["type"] {
  if (
    err &&
    typeof err === "object" &&
    "type" in err &&
    typeof (err as { type: unknown }).type === "string"
  ) {
    return (err as GradesFailure).type;
  }
  return "unknown";
}

export async function listApprovalBatchesAction(
  statusFilter?: BatchStatus,
): Promise<Result<GradeApprovalBatch[]>> {
  try {
    const repo = await makeGradeApprovalRepository();
    return { ok: true, data: await repo.listApprovalBatches(statusFilter) };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function getBatchDetailAction(
  batchId: string,
): Promise<Result<GradeApprovalBatchDetail>> {
  try {
    const repo = await makeGradeApprovalRepository();
    return { ok: true, data: await repo.getBatchDetail(batchId) };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function approveGradeBatchAction(
  batchId: string,
): Promise<Result<GradeApprovalBatch>> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  try {
    const useCase = await makeApproveGradeBatchUseCase();
    return { ok: true, data: await useCase.execute(batchId) };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function requestGradeRevisionAction(
  batchId: string,
  note: string,
): Promise<Result<GradeApprovalBatch>> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  try {
    const useCase = await makeRequestGradeRevisionUseCase();
    return { ok: true, data: await useCase.execute(batchId, note) };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function bulkLockBatchesAction(
  batchIds: string[],
): Promise<Result<GradeApprovalBatch[]>> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  try {
    const useCase = await makeBulkLockBatchesUseCase();
    return { ok: true, data: await useCase.execute(batchIds) };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}
