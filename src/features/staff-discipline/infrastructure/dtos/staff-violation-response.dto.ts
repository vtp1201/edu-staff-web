/**
 * `staff-violations` wire shape (camelCase, `core` conduct sub-domain).
 *
 * Deliberately carries NO `staffName` / `department`: the real response does not
 * (spec §6/§8) — the mapper resolves those from the fixed roster. `selfApproved`
 * is optional here because the entity's value is ALWAYS re-derived from
 * `authorMemberId`/`approverMemberId` (ADR 0073 single source of truth).
 */
export interface StaffViolationResponseDto {
  recordId: string;
  staffMemberId: string;
  category: string;
  description: string;
  severity: "MINOR" | "MODERATE" | "SEVERE";
  occurredAt: string;
  state: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  authorMemberId: string;
  approverMemberId?: string;
  selfApproved?: boolean;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}
