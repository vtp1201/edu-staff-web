import type {
  ClassOption,
  SealAuditEntry,
  SealBatchKey,
  SealBatchResult,
  SealBatchStatus,
  SealedStudentOption,
  TenantAdminSummary,
  UnsealRequest,
} from "../../domain/entities/seal-batch.entity";
import type {
  ClassOptionResponseDto,
  SealAcademicRecordResponseDto,
  SealAuditEntryResponseDto,
  SealBatchResponseDto,
  SealedStudentListItemDto,
  TenantAdminResponseDto,
  UnsealRequestResponseDto,
} from "../dtos/seal-response.dto";

/** US-E18.13 — real seal POST response → `SealBatchResult` (errors default []). */
export function sealBatchResultMapper(
  dto: SealAcademicRecordResponseDto,
): SealBatchResult {
  return {
    sealedCount: dto.sealedCount,
    failedCount: dto.failedCount,
    errors: dto.errors ?? [],
  };
}

/** DTO → entity mappers for the US-E14.6 seal surface. Wire is camelCase and
 * already 1:1 with the entities, so these are structural pass-throughs that pin
 * the boundary (a BE field rename fails compile here, not deep in the UI). */

export function sealBatchMapper(dto: SealBatchResponseDto): SealBatchStatus {
  return {
    classId: dto.classId,
    term: dto.term,
    year: dto.year,
    subjectLabel: dto.subjectLabel,
    allLocked: dto.allLocked,
    totalStudents: dto.totalStudents,
    unlockedStudents: dto.unlockedStudents,
    unlockedSubjectNames: dto.unlockedSubjectNames,
    status: dto.status,
    sealedAt: dto.sealedAt,
    sealedBy: dto.sealedBy,
  };
}

export function sealAuditEntryMapper(
  dto: SealAuditEntryResponseDto,
): SealAuditEntry {
  return {
    id: dto.id,
    classId: dto.classId,
    term: dto.term,
    year: dto.year,
    actorName: dto.actorName,
    action: dto.action,
    occurredAt: dto.occurredAt,
  };
}

export function unsealRequestMapper(
  dto: UnsealRequestResponseDto,
): UnsealRequest {
  return {
    id: dto.id,
    studentId: dto.studentId,
    studentName: dto.studentName,
    classId: dto.classId,
    term: dto.term,
    year: dto.year,
    reason: dto.reason,
    requestedById: dto.requestedById,
    requestedByName: dto.requestedByName,
    requestedAt: dto.requestedAt,
    status: dto.status,
    coSignerId: dto.coSignerId,
    coSignerName: dto.coSignerName,
    confirmedAt: dto.confirmedAt,
    selfApproved: dto.selfApproved,
  };
}

export function tenantAdminMapper(
  dto: TenantAdminResponseDto,
): TenantAdminSummary {
  return { id: dto.id, name: dto.name };
}

export function classOptionMapper(dto: ClassOptionResponseDto): ClassOption {
  return { classId: dto.classId, className: dto.className };
}

/**
 * US-E18.43 (BE US-183) — real `SealedStudentResponse` → {@link
 * SealedStudentOption}. The wire row is KEY-LESS and name-less, so two things are
 * re-attached here:
 * - `classId`/`term`/`year` from the CALLER's `SealBatchKey` (the request path
 *   already carried them; same precedent as `sealStatusRollupMapper`);
 * - `studentName` from ONE IAM batch lookup — an id missing from `nameMap`
 *   degrades to the raw id, a degraded display and never an error (same
 *   convention as `unsealRequestSummaryMapper`).
 *
 * `sealedBy`/`resealCount` are deliberately DROPPED: no consumer renders them
 * today (the picker shows name · class · year + a "sealed <date>" hint), and
 * `SealedStudentOption` is the picker's boundary contract — a future UI story can
 * widen the entity when it actually surfaces them.
 */
export function sealedStudentMapper(
  dto: SealedStudentListItemDto,
  key: SealBatchKey,
  nameMap: Map<string, string>,
): SealedStudentOption {
  return {
    studentId: dto.studentMemberId,
    studentName: nameMap.get(dto.studentMemberId) ?? dto.studentMemberId,
    classId: key.classId,
    term: key.term,
    year: key.year,
    sealedAt: dto.sealedAt,
  };
}
