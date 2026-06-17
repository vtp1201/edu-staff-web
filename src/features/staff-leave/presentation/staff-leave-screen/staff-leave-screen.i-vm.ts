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
  onApprove: (id: string) => Promise<StaffLeaveActionOutcome>;
  onReject: (id: string, reason: string) => Promise<StaffLeaveActionOutcome>;
}
