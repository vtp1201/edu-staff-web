import type { LeaveRequestEntity } from "../entities/leave-request.entity";
import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

const MIN_REASON_LENGTH = 10;

export class RejectLeaveUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(id: string, reason: string): Promise<LeaveRequestEntity> {
    if (reason.trim().length < MIN_REASON_LENGTH) {
      const failure: DisciplineFailure = { type: "missing-reject-reason" };
      throw failure;
    }
    return this.repo.rejectLeave(id, reason);
  }
}
