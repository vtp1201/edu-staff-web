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

/**
 * US-E18.24 — CLASS+TERM-LEVEL rollup enum from the real
 * `GET .../academic-records/seal-status` (`SealStatusResponse.status`).
 * DELIBERATELY DISTINCT from the per-record `TermStatus`
 * (`PENDING|SEALED|UNSEALED`): this answers "is this class+term frozen — fully,
 * partly, or not at all?", never the state of one student's record. Do not
 * conflate the two (the wire contract says so verbatim).
 */
export type SealRollupStatus = "PENDING" | "SEALED" | "PARTIAL";

/**
 * US-E18.24 — 1:1 with the real `SealStatusResponse`, plus the `SealBatchKey`
 * the caller already knows (the wire response is key-less).
 *
 * Truth table (ground-truthed `core` INTEGRATION.md / openapi.yaml):
 *  - `totalStudents === 0` → `PENDING`;
 *  - `sealedCount === 0` → `PENDING` — covers BOTH "never sealed" AND "sealed
 *    then fully unsealed"; the only way to tell them apart is a non-null
 *    `lastSealedAt` (+ `unsealedCount > 0`). There is no 4th enum value;
 *  - `0 < sealedCount < totalStudents` → `PARTIAL`;
 *  - `sealedCount === totalStudents` → `SEALED`.
 *
 * `lastSealedAt` is the MAX `sealedAt` across all enrolled rows INCLUDING
 * currently-UNSEALED ones (an unseal does not clear seal history).
 * `resealCount` is the MAXIMUM per-record reseal count in the class term (NOT a
 * sum) — i.e. how close the closest record is to the 5-reseal cap.
 */
export interface SealStatusRollup extends SealBatchKey {
  totalStudents: number;
  sealedCount: number;
  unsealedCount: number;
  status: SealRollupStatus;
  lastSealedAt: string | null;
  resealCount: number;
}

/**
 * MOCK-INTERNAL-ONLY bookkeeping since US-E18.24. The real
 * `getSealStatus` returns {@link SealStatusRollup}; this richer decorative
 * shape (`allLocked`, `unlockedSubjectNames`, `sealedBy`, …) has NO wire
 * equivalent at that granularity and is never returned by any repository
 * method on the real branch. The mock keeps it as internal state (its reactive
 * `sealBatch` check needs `allLocked`) and maps to the narrow boundary entity.
 */
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

/** Wire status bucket for `GET .../unseal-requests?status=` (US-E18.24). */
export type UnsealRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

/**
 * US-E18.24 — one row of the real `UnsealRequestListItem`, plus the two display
 * names the FE resolves itself (`core` deliberately does not duplicate IAM
 * names — resolved via `iam-directory`'s batch lookup, composed in
 * `bootstrap/di/academic-records.di.ts`). An unresolvable id falls back to the
 * raw id, never to an error.
 */
export interface UnsealRequestSummary {
  requestId: string;
  classId: string;
  termId: string;
  studentMemberId: string;
  /** Resolved display name; falls back to `studentMemberId` when unresolved. */
  studentName: string;
  requestedBy: string;
  /** Resolved display name; falls back to `requestedBy` when unresolved. */
  requestedByName: string;
  reason: string;
  status: UnsealRequestStatus;
  createdAt: string; // ISO
}

/** US-E18.24 — 1:1 with the real `RequestUnsealResponse` (201 create). */
export interface UnsealInitiateResult {
  requestId: string;
  status: "PENDING";
  createdAt: string; // ISO
}

/**
 * US-E18.24 — 1:1 with the real `ApproveUnsealResponse` (200 approve).
 * `unsealedAt` is OPTIONAL on the wire (not in the schema's `required` list) →
 * modelled nullable here rather than pretending it is always present.
 */
export interface UnsealApproveResult {
  classId: string;
  termId: string;
  studentMemberId: string;
  status: "UNSEALED";
  selfApproved: boolean;
  unsealedAt: string | null;
}

/**
 * MOCK-INTERNAL-ONLY bookkeeping since US-E18.24 (same demotion as
 * {@link SealBatchStatus}). Its co-signer/self-approve fields have no wire
 * equivalent; the real branch returns {@link UnsealRequestSummary} /
 * {@link UnsealInitiateResult} / {@link UnsealApproveResult} instead. The mock
 * keeps this richer state internally and maps at each method's boundary.
 */
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
  /**
   * ISO — for the "Sealed <date>" hint in the picker. NULLABLE since US-E18.43:
   * the real `SealedStudentResponse` (BE US-183) declares `sealedAt` nullable, so
   * the hint is hidden instead of rendering an Invalid Date. The row stays
   * selectable — a sealed student must never vanish from the unseal picker.
   */
  sealedAt: string | null;
}

export interface InitiateUnsealInput {
  studentId: string;
  classId: string;
  term: Term;
  year: string;
  reason: string;
  initiatorId: string;
}
