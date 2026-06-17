import type { LeaveRequestEntity } from "../entities/leave-request.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

export class GetLeaveRequestsUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(params: { classId?: string }): Promise<LeaveRequestEntity[]> {
    return this.repo.getLeaveRequests(params);
  }
}
