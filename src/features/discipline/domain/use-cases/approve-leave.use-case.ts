import type {
  DecideLeaveInput,
  LeaveRequestEntity,
} from "../entities/leave-request.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

/**
 * Approve a submitted student leave request.
 *
 * The GVCN scope check itself lives at the REPOSITORY boundary (decision
 * `0063`) — both implementations run it as their first statement, so a forged
 * `authCtx` is refused even when a caller bypasses this use-case entirely.
 */
export class ApproveLeaveUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(input: DecideLeaveInput): Promise<LeaveRequestEntity> {
    return this.repo.approveLeave(input);
  }
}
