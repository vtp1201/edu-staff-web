import type { TermStatus } from "../../domain/entities/academic-record.entity";
import type { Term } from "../../domain/entities/seal-batch.entity";

/** Wire shapes for the US-E14.6 admin seal/unseal surface (camelCase, core US-064). */

/**
 * US-E18.13 — REAL `SealAcademicRecordResponse` (core `AcademicRecords` tag).
 * `errors` is an optional free-text per-student message list (camelCase wire).
 */
export interface SealAcademicRecordResponseDto {
  sealedCount: number;
  failedCount: number;
  errors?: string[];
}

export interface SealBatchResponseDto {
  classId: string;
  term: Term;
  year: string;
  subjectLabel: string;
  allLocked: boolean;
  totalStudents: number;
  unlockedStudents: number;
  unlockedSubjectNames: string[];
  status: TermStatus;
  sealedAt: string | null;
  sealedBy: string | null;
}

export interface SealAuditEntryResponseDto {
  id: string;
  classId: string;
  term: Term;
  year: string;
  actorName: string;
  action: "SEAL" | "UNSEAL";
  occurredAt: string;
}

export interface UnsealRequestResponseDto {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  term: Term;
  year: string;
  reason: string;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  status: "PENDING" | "APPROVED";
  coSignerId: string | null;
  coSignerName: string | null;
  confirmedAt: string | null;
  selfApproved: boolean;
}

export interface TenantAdminResponseDto {
  id: string;
  name: string;
}

export interface ClassOptionResponseDto {
  classId: string;
  className: string;
}

/**
 * US-E18.43 — REAL `SealedStudentResponse` (core `AcademicRecords` tag, BE
 * US-183): `GET /classes/{classId}/terms/{termId}/academic-records/
 * sealed-students`, ADMIN/SUPER_ADMIN, UNPAGINATED (bounded by the class
 * roster), and already narrowed server-side to the currently-SEALED subset of
 * enrolled students (residue rows for un-enrolled students are excluded).
 *
 * KEY-LESS by design — class/term/year are implied by the request path (same
 * precedent as `SealStatusResponse`) — and it carries NO display name: `core`
 * ships raw member UUIDs, so `studentName` comes from IAM's batch member lookup.
 * `sealedAt`/`sealedBy` are nullable per the schema.
 */
export interface SealedStudentListItemDto {
  studentMemberId: string;
  sealedAt: string | null;
  sealedBy: string | null;
  resealCount: number;
}

/**
 * MOCK-ERA INVENTED shape (US-E14.6) — superseded by
 * {@link SealedStudentListItemDto} in US-E18.43 and matched by NO wire response
 * (the real payload has no `studentName`/`classId`/`term`/`year`, ids
 * `studentMemberId`, and adds `sealedBy`/`resealCount`). Retained only as a
 * record of what the pre-BE-US-183 surface assumed; no code path reads it — the
 * in-memory mock repository returns `SealedStudentOption` fixtures directly and
 * never went through a DTO.
 */
export interface SealedStudentResponseDto {
  studentId: string;
  studentName: string;
  classId: string;
  term: Term;
  year: string;
  sealedAt: string;
}
