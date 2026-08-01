import type {
  SealBatchKey,
  SealStatusRollup,
  UnsealApproveResult,
  UnsealInitiateResult,
  UnsealRequestSummary,
} from "../../domain/entities/seal-batch.entity";
import type {
  ApproveUnsealResponseDto,
  RequestUnsealResponseDto,
  SealStatusResponseDto,
  UnsealRequestListItemDto,
} from "../dtos/unseal-response.dto";

/**
 * US-E18.24 — DTO → entity mappers for the REAL unseal/seal-rollup surface.
 * Structural pass-throughs that PIN the boundary (a BE field rename fails
 * compile here, not deep in the UI). Two deliberate normalisations only:
 * optional wire fields (`lastSealedAt`, `unsealedAt`) collapse `undefined` →
 * `null`, and display names are attached from a resolved `nameMap`.
 */

/**
 * `SealStatusResponse` → {@link SealStatusRollup}. The wire response carries no
 * key (it is implied by the path), so the caller's `SealBatchKey` is re-attached
 * here. `status` is the SERVER's rollup verdict — never re-derived client-side.
 */
export function sealStatusRollupMapper(
  dto: SealStatusResponseDto,
  key: SealBatchKey,
): SealStatusRollup {
  return {
    classId: key.classId,
    term: key.term,
    year: key.year,
    totalStudents: dto.totalStudents,
    sealedCount: dto.sealedCount,
    unsealedCount: dto.unsealedCount,
    status: dto.status,
    lastSealedAt: dto.lastSealedAt ?? null,
    resealCount: dto.resealCount,
  };
}

/**
 * `UnsealRequestListItem` → {@link UnsealRequestSummary}. `core` ships raw
 * member UUIDs only; `nameMap` comes from ONE IAM batch lookup per page. An id
 * missing from the map degrades to the raw id — a degraded display, never an
 * error (same convention as `staffing.repository.ts`).
 */
export function unsealRequestSummaryMapper(
  dto: UnsealRequestListItemDto,
  nameMap: Map<string, string>,
): UnsealRequestSummary {
  return {
    requestId: dto.requestId,
    classId: dto.classId,
    termId: dto.termId,
    studentMemberId: dto.studentMemberId,
    studentName: nameMap.get(dto.studentMemberId) ?? dto.studentMemberId,
    requestedBy: dto.requestedBy,
    requestedByName: nameMap.get(dto.requestedBy) ?? dto.requestedBy,
    reason: dto.reason,
    status: dto.status,
    createdAt: dto.createdAt,
  };
}

/** `RequestUnsealResponse` → {@link UnsealInitiateResult}. */
export function unsealInitiateResultMapper(
  dto: RequestUnsealResponseDto,
): UnsealInitiateResult {
  return {
    requestId: dto.requestId,
    status: dto.status,
    createdAt: dto.createdAt,
  };
}

/** `ApproveUnsealResponse` → {@link UnsealApproveResult}. */
export function unsealApproveResultMapper(
  dto: ApproveUnsealResponseDto,
): UnsealApproveResult {
  return {
    classId: dto.classId,
    termId: dto.termId,
    studentMemberId: dto.studentMemberId,
    status: dto.status,
    selfApproved: dto.selfApproved,
    unsealedAt: dto.unsealedAt ?? null,
  };
}
