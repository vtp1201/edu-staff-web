import type { StaffLeaveRequestEntity } from "@/features/staff-leave/domain/entities/staff-leave-request.entity";
import type { StaffLeaveFailure } from "@/features/staff-leave/domain/failures/staff-leave.failure";

/** Stable error key surfaced by the action (presentation translates it). */
export type StaffLeaveErrorKey = StaffLeaveFailure["type"];

export type StaffLeaveActionOutcome =
  | { ok: true }
  | { ok: false; errorKey: StaffLeaveErrorKey };

export interface StaffLeaveScreenVM {
  initialRequests: StaffLeaveRequestEntity[];
  /** When true the screen renders the error banner instead of the list. */
  loadFailed?: boolean;
  /**
   * `staffId` is required alongside `id`: the real approve/reject routes take
   * a MANDATORY `staffMemberId` query param (it completes the storage key) —
   * see `IStaffLeaveRepository` (US-E18.36).
   */
  onApprove: (id: string, staffId: string) => Promise<StaffLeaveActionOutcome>;
  onReject: (
    id: string,
    staffId: string,
    reason: string,
  ) => Promise<StaffLeaveActionOutcome>;
}
