/**
 * Wire shape for a staff leave request — `core`'s `StaffLeaveRequestResponse`
 * (ground-truthed against `edu-api/services/core/docs/openapi.yaml`, US-E18.36
 * / core US-149 + US-170).
 *
 * REPLACES the pre-US-E18.36 anticipatory DTO, which described an idealised
 * already-display-shaped row (`staffName`, `days`, `initials`, `DD/MM/YYYY`
 * dates) that BE has never produced — it existed only alongside the mock. The
 * real wire is narrow: ids, ISO dates and enums; every display field is
 * DERIVED by the mapper or resolved from IAM.
 */

/** `state` on the wire — there is no literal `pending` (that is `SUBMITTED`). */
export type StaffLeaveStateDto = "SUBMITTED" | "APPROVED" | "REJECTED";

/** `leaveType` on the wire — UPPERCASE, matching core's enum convention. */
export type StaffLeaveTypeDto = "ANNUAL" | "SICK" | "PERSONAL" | "FAMILY";

export interface StaffLeaveResponseDto {
  requestId: string;
  /** Submitter AND subject — self-service, no author/subject split (ADR 0073). */
  staffMemberId: string;
  /** ISO date `YYYY-MM-DD`. */
  startDate: string;
  /** ISO date `YYYY-MM-DD`. */
  endDate: string;
  reason: string;
  state: StaffLeaveStateDto;
  /** Set once an ADMIN/MANAGER decision has been recorded. */
  approverMemberId?: string | null;
  /** ADR 0073 single-admin-tenant self-approval fallback. */
  selfApproved: boolean;
  rejectionReason?: string | null;
  /**
   * `null` ONLY for rows submitted before core US-170 (not backfilled) — a
   * legacy gap, not an ongoing state. See the entity's field doc.
   */
  leaveType?: StaffLeaveTypeDto | null;
  /**
   * Current department name resolved at read time; `null` when the staff
   * member holds no ACTIVE department-scoped assignment — an ongoing, valid
   * business state. See the entity's field doc.
   */
  department?: string | null;
  /** RFC3339 date-time. */
  createdAt: string;
  /** RFC3339 date-time. */
  updatedAt: string;
}
