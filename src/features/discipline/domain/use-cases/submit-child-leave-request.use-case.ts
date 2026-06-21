import type {
  LeaveRequestEntity,
  SubmitChildLeaveRequestInput,
} from "../entities/leave-request.entity";
import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

const MIN_REASON_LENGTH = 10;

function fail(type: DisciplineFailure["type"]): never {
  const failure: DisciplineFailure = { type };
  throw failure;
}

/** Local date in ISO "YYYY-MM-DD" (no timezone shift). */
function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parent submits a leave request on behalf of a child (US-E09.4). The childId
 * is required; `parentId`/`submittedBy` are derived server-side and never part
 * of the input. Start date must be today or later; end >= start; reason >= 10.
 */
export class SubmitChildLeaveRequestUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  /**
   * @param today injectable "YYYY-MM-DD" for deterministic tests.
   */
  async execute(
    childId: string,
    input: SubmitChildLeaveRequestInput,
    today: string = todayISO(),
  ): Promise<LeaveRequestEntity> {
    if (!childId) fail("invalid-child");
    if (input.reason.trim().length < MIN_REASON_LENGTH) {
      fail("reason-too-short");
    }
    // ISO "YYYY-MM-DD" strings compare lexicographically as dates.
    if (input.startDate < today) fail("invalid-date");
    if (input.endDate < input.startDate) fail("invalid-date");
    return this.repo.submitLeaveForChild(childId, input);
  }
}
