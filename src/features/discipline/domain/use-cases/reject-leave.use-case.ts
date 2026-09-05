import type {
  DecideLeaveInput,
  LeaveRequestEntity,
} from "../entities/leave-request.entity";
import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

export const MIN_REJECT_REASON_LENGTH = 10;

/**
 * Reject a submitted student leave request with a mandatory reason.
 *
 * The reason floor is a UX rule this app owns (core only requires a NON-EMPTY
 * `rejectionReason`, `422 VIOLATION_REJECTION_REASON_REQUIRED`); the GVCN scope
 * check lives at the repository boundary (decision `0063`).
 */
export class RejectLeaveUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(
    input: DecideLeaveInput & { reason: string },
  ): Promise<LeaveRequestEntity> {
    if (input.reason.trim().length < MIN_REJECT_REASON_LENGTH) {
      const failure: DisciplineFailure = { type: "missing-reject-reason" };
      throw failure;
    }
    return this.repo.rejectLeave(input);
  }
}
