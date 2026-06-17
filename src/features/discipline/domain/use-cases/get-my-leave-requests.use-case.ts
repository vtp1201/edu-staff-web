import type { LeaveRequestEntity } from "../entities/leave-request.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

export class GetMyLeaveRequestsUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(studentId: string): Promise<LeaveRequestEntity[]> {
    return this.repo.getMyLeaveRequests(studentId);
  }
}
