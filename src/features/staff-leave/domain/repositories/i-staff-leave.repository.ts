import type {
  StaffLeaveRequestEntity,
  StaffLeaveStatus,
} from "../entities/staff-leave-request.entity";
import type { StaffLeaveFailure } from "../failures/staff-leave.failure";

/** Result type used across the staff-leave repository contract (US-E09.3). */
export type StaffLeaveResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: StaffLeaveFailure };

export type StaffLeaveActionResult =
  | { ok: true }
  | { ok: false; error: StaffLeaveFailure };

/**
 * Staff leave repository contract (US-E09.3). Implementations return a Result
 * (no throw); errors are normalised from the BE ApiError by error.code/status.
 * Wire fields are camelCase per the api-integration rule.
 */
export interface IStaffLeaveRepository {
  listRequests(filter?: {
    status?: StaffLeaveStatus;
  }): Promise<StaffLeaveResult<StaffLeaveRequestEntity[]>>;
  approve(id: string): Promise<StaffLeaveActionResult>;
  reject(id: string, reason: string): Promise<StaffLeaveActionResult>;
}
