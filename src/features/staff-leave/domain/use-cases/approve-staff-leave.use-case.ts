import type {
  IStaffLeaveRepository,
  StaffLeaveActionResult,
} from "../repositories/i-staff-leave.repository";

export class ApproveStaffLeaveUseCase {
  constructor(private readonly repo: IStaffLeaveRepository) {}

  /** `staffId` completes the storage key — see `IStaffLeaveRepository`. */
  execute(id: string, staffId: string): Promise<StaffLeaveActionResult> {
    return this.repo.approve(id, staffId);
  }
}
