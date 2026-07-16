import type {
  ClassOption,
  SealAuditEntry,
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
  SealedStudentResponseDto,
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

export function sealedStudentMapper(
  dto: SealedStudentResponseDto,
): SealedStudentOption {
  return {
    studentId: dto.studentId,
    studentName: dto.studentName,
    classId: dto.classId,
    term: dto.term,
    year: dto.year,
    sealedAt: dto.sealedAt,
  };
}
