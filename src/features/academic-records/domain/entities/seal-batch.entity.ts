import type { TermStatus } from "./academic-record.entity";

/**
 * US-E14.6 — Admin BULK/BATCH seal view keyed by (classId, term, year).
 * Reuses `TermStatus` ("PENDING"|"SEALED"|"UNSEALED") from the per-student
 * `academic-record.entity.ts` as the shared status vocabulary — no parallel enum.
 */

export type Term = "HK1" | "HK2";

export interface SealBatchKey {
  classId: string;
  term: Term;
  year: string;
}

export interface SealBatchStatus extends SealBatchKey {
  subjectLabel: string; // for gate messaging
  allLocked: boolean;
  totalStudents: number;
  unlockedStudents: number;
  unlockedSubjectNames: string[]; // AC-3 "danh sach mon chua khoa"
  status: TermStatus; // derived: PENDING (not sealed) | SEALED | UNSEALED
  sealedAt: string | null;
  sealedBy: string | null; // admin display name
}

export interface SealAuditEntry {
  id: string;
  classId: string;
  term: Term;
  year: string;
  actorName: string;
  action: "SEAL" | "UNSEAL";
  occurredAt: string; // ISO
}

export interface UnsealRequest {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  term: Term;
  year: string;
  reason: string;
  requestedById: string;
  requestedByName: string;
  requestedAt: string; // ISO
  status: "PENDING" | "APPROVED";
  coSignerId: string | null; // null until confirmed / self-approve
  coSignerName: string | null;
  confirmedAt: string | null;
  selfApproved: boolean; // ADR 0037 fallback flag
}

export interface TenantAdminSummary {
  id: string;
  name: string;
}

export interface ClassOption {
  classId: string;
  className: string;
}

export interface SealedStudentOption {
  studentId: string;
  studentName: string;
  classId: string;
  term: Term;
  year: string;
  sealedAt: string; // ISO — for the "Sealed <date>" hint in the picker
}

export interface InitiateUnsealInput {
  studentId: string;
  classId: string;
  term: Term;
  year: string;
  reason: string;
  initiatorId: string;
}
