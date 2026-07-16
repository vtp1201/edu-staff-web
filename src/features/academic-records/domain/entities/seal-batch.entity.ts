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
  /**
   * US-E18.13 — number of times this batch has been (re)sealed. Decorative-only
   * mock state used to simulate the real `ACADEMIC_RECORD_TOO_MANY_RESEALS`
   * cap (5) reactively; NOT a wire field on `getSealStatus` (there is no
   * seal-status GET endpoint at all — see ADR 0055). Defaults to 0 when absent.
   */
  resealCount?: number;
}

/**
 * US-E18.13 — result of a real batch-seal POST, 1:1 with the `core` service's
 * `SealAcademicRecordResponse` (`{sealedCount, failedCount, errors[]}`). A plain
 * success-report; per-student detail is only a free-text `errors` string list.
 * This is the authoritative outcome of a seal attempt — unlike the decorative
 * `SealBatchStatus` "X/Y locked" hint from the mocked `getSealStatus`.
 */
export interface SealBatchResult {
  sealedCount: number;
  failedCount: number;
  errors: string[];
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
