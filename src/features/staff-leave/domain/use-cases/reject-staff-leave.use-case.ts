import type { StaffLeaveFailure } from "../failures/staff-leave.failure";
import type {
  IStaffLeaveRepository,
  StaffLeaveActionResult,
} from "../repositories/i-staff-leave.repository";

const MIN_REASON_LENGTH = 10;

export class RejectStaffLeaveUseCase {
  constructor(private readonly repo: IStaffLeaveRepository) {}

  async execute(id: string, reason: string): Promise<StaffLeaveActionResult> {
    const trimmed = reason.trim();
    if (trimmed.length === 0) {
      const error: StaffLeaveFailure = { type: "missing-reject-reason" };
      return { ok: false, error };
    }
    if (trimmed.length < MIN_REASON_LENGTH) {
      const error: StaffLeaveFailure = { type: "reason-too-short" };
      return { ok: false, error };
    }
    return this.repo.reject(id, trimmed);
  }
}
