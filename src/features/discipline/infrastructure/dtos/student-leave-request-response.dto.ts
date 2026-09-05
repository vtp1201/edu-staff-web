/**
 * `StudentLeaveRequestResponse` — the REAL `core` conduct wire shape
 * (`edu-api/services/core/docs/openapi.yaml`, US-E24.11).
 *
 * Deliberately separate from the pre-existing `LeaveRequestResponseDto`, which
 * models a much richer record the real BE never returns (`studentName`,
 * `className`, `submitterName`, `dayCount`, `type`, `initials`, `avatarTone`
 * are all mock-era inventions). That DTO stays as the mock repository's fixture
 * typing; this one is the only shape a real response is cast to.
 *
 * Every display field the UI needs is therefore either resolved through the IAM
 * directory (names) or supplied by the caller (class name) — see
 * `leave-request.mapper.ts`.
 */
export interface StudentLeaveRequestResponseDto {
  requestId: string;
  studentMemberId: string;
  classId: string;
  /** ISO `YYYY-MM-DD`. */
  startDate: string;
  /** ISO `YYYY-MM-DD`. */
  endDate: string;
  reason: string;
  state: "SUBMITTED" | "APPROVED" | "REJECTED";
  /** The STUDENT or linked PARENT who submitted the request. */
  submittedByMemberId: string;
  /** Set once the GVCN has approved or rejected the request. */
  approverMemberId?: string | null;
  /** Set on a `REJECTED` request. */
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}
