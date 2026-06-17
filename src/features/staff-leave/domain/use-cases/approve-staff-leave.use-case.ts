import type {
  IStaffLeaveRepository,
  StaffLeaveActionResult,
} from "../repositories/i-staff-leave.repository";

export class ApproveStaffLeaveUseCase {
  constructor(private readonly repo: IStaffLeaveRepository) {}

  execute(id: string): Promise<StaffLeaveActionResult> {
    return this.repo.approve(id);
  }
}
