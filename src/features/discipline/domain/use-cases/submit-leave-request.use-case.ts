import type {
  LeaveRequestEntity,
  SubmitLeaveRequestInput,
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

export class SubmitLeaveRequestUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  /**
   * @param today injectable "YYYY-MM-DD" for deterministic tests (defaults to
   *   the local date). Start date must be today or later; reason >= 10 chars.
   */
  async execute(
    input: SubmitLeaveRequestInput,
    today: string = todayISO(),
  ): Promise<LeaveRequestEntity> {
    if (input.reason.trim().length < MIN_REASON_LENGTH) {
      fail("reason-too-short");
    }
    // ISO "YYYY-MM-DD" strings compare lexicographically as dates.
    if (input.startDate < today) fail("invalid-date");
    return this.repo.submitLeaveRequest(input);
  }
}
