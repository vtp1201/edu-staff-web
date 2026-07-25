/**
 * Staff-violation domain entity (US-E09.5, `core` conduct sub-domain, staff track).
 *
 * `staffName` / `department` are NOT on the real wire (spec.md §6/§8) — they are
 * resolved client-side against the fixed mock roster (`StaffRosterEntry`) by the
 * mapper, since no roster-search endpoint exists (roster-UUID gap, FR-009/FR-013).
 */

/** Shared 4-state `ApprovalTransition` lifecycle (both sub-resources). */
export type StaffApprovalState =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED";

export const STAFF_APPROVAL_STATES: readonly StaffApprovalState[] = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
] as const;

export type StaffViolationSeverity = "MINOR" | "MODERATE" | "SEVERE";

export const STAFF_VIOLATION_SEVERITIES: readonly StaffViolationSeverity[] = [
  "MINOR",
  "MODERATE",
  "SEVERE",
] as const;

export interface StaffViolationEntity {
  recordId: string;
  staffMemberId: string;
  /** Mock-roster resolved — never on the wire. */
  staffName: string;
  /** Mock-roster resolved — never on the wire. */
  department: string;
  category: string;
  description: string;
  severity: StaffViolationSeverity;
  /** ISO date/datetime string. */
  occurredAt: string;
  state: StaffApprovalState;
  authorMemberId: string;
  approverMemberId?: string;
  /** Read-derived: `approverMemberId === authorMemberId` (ADR 0073). */
  selfApproved: boolean;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffViolationInput {
  staffMemberId: string;
  category: string;
  description: string;
  severity: StaffViolationSeverity;
  occurredAt: string;
}

export interface RejectStaffViolationInput {
  recordId: string;
  rejectionReason: string;
}
