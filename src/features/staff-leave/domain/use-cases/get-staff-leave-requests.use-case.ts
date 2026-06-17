import type {
  StaffLeaveRequestEntity,
  StaffLeaveStatus,
} from "../entities/staff-leave-request.entity";
import type {
  IStaffLeaveRepository,
  StaffLeaveResult,
} from "../repositories/i-staff-leave.repository";

export class GetStaffLeaveRequestsUseCase {
  constructor(private readonly repo: IStaffLeaveRepository) {}

  execute(filter?: {
    status?: StaffLeaveStatus;
  }): Promise<StaffLeaveResult<StaffLeaveRequestEntity[]>> {
    return this.repo.listRequests(filter);
  }
}
