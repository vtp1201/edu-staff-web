import type { TermStatus } from "../../domain/entities/academic-record.entity";
import type { Term } from "../../domain/entities/seal-batch.entity";

/** Wire shapes for the US-E14.6 admin seal/unseal surface (camelCase, core US-064). */

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

export interface SealedStudentResponseDto {
  studentId: string;
  studentName: string;
  classId: string;
  term: Term;
  year: string;
  sealedAt: string;
}
