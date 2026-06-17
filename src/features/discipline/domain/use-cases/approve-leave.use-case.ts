import type { LeaveRequestEntity } from "../entities/leave-request.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

export class ApproveLeaveUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(id: string): Promise<LeaveRequestEntity> {
    return this.repo.approveLeave(id);
  }
}
