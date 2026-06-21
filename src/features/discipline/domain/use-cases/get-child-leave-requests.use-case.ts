import type { LeaveRequestEntity } from "../entities/leave-request.entity";
import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

function fail(type: DisciplineFailure["type"]): never {
  const failure: DisciplineFailure = { type };
  throw failure;
}

/** Returns the leave history for one of the parent's children (US-E09.4). */
export class GetChildLeaveRequestsUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(childId: string): Promise<LeaveRequestEntity[]> {
    if (!childId) fail("invalid-child");
    return this.repo.getChildLeaveRequests(childId);
  }
}
