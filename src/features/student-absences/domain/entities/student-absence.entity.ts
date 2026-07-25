/**
 * Student-absence domain entity (US-E09.6, `core` conduct sub-domain).
 *
 * Exact wire shape (spec.md §6, ground-truthed against
 * `edu-api/services/core/internal/conduct/.../dto/student_absence.go`). There is
 * NO `studentName`/`className` on the wire (roster-UUID gap, FR-010) — display
 * names are resolved at the PRESENTATION layer against the static roster.
 *
 * This is a 2-state, ONE-WAY domain (`RECORDED` → `FLAGGED_UNEXCUSED`, terminal).
 * It deliberately does NOT reuse the shared `ApprovalTransition`
 * (DRAFT/SUBMITTED/APPROVED/REJECTED) shape used by `discipline`/
 * `staff-discipline` — see spec.md §1 "Out-of-scope".
 */

export type StudentAbsenceState = "RECORDED" | "FLAGGED_UNEXCUSED";

export const STUDENT_ABSENCE_STATES: readonly StudentAbsenceState[] = [
  "RECORDED",
  "FLAGGED_UNEXCUSED",
] as const;

/** Max length of the optional free-text reason (BE contract, FR-001/FR-004). */
export const STUDENT_ABSENCE_REASON_MAX_LENGTH = 5000;

export interface StudentAbsenceEntity {
  classId: string;
  studentMemberId: string;
  /** Bare `YYYY-MM-DD` calendar date — NOT a datetime (NFR-009). */
  date: string;
  reason?: string;
  /** Teacher-editable signal. Independent of `state` (FR-007). */
  excused: boolean;
  /** Principal-set signal. Independent of `excused` (FR-007). */
  state: StudentAbsenceState;
  recordedByMemberId: string;
  flaggedByMemberId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Natural key — `classId + studentMemberId + date`. Immutable once created; never
 * sent as an editable PATCH body field (FR-004/AC-004.3).
 */
export interface StudentAbsenceKey {
  classId: string;
  studentMemberId: string;
  date: string;
}

/** INT-001 body (POST). */
export interface RecordStudentAbsenceInput {
  classId: string;
  studentMemberId: string;
  /** Bare `YYYY-MM-DD`, must be ≤ today (FR-002). */
  date: string;
  excused: boolean;
  reason?: string;
}

/**
 * INT-003 (PATCH). `classId`/`studentMemberId`/`date` are the natural key
 * (path + query), NOT editable body fields. `reason`/`excused` are
 * INDEPENDENTLY optional — the caller passes ONLY what actually changed, and no
 * layer re-sends an unchanged echo (AC-004.2).
 */
export interface EditStudentAbsenceInput extends StudentAbsenceKey {
  reason?: string;
  excused?: boolean;
}

/** Stable string form of the natural key — React `key`s, map lookups, tests. */
export function studentAbsenceKeyOf(key: StudentAbsenceKey): string {
  return `${key.classId}|${key.studentMemberId}|${key.date}`;
}
