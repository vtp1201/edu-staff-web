import type {
  LeaveRequestEntity,
  SubmitMyLeaveRequestInput,
} from "../entities/leave-request.entity";
import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

/** core `CreateStudentLeaveRequestRequest.reason` — `minLength 1, maxLength 500`. */
const MAX_REASON_LENGTH = 500;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function fail(type: DisciplineFailure["type"]): never {
  const failure: DisciplineFailure = { type };
  throw failure;
}

/**
 * Submit a leave request against the REAL core contract (US-E24.6).
 *
 * Sibling to `SubmitLeaveRequestUseCase`, which keeps serving the two legacy
 * force-mocked screens on the legacy input shape — see
 * {@link SubmitMyLeaveRequestInput} for why this is an addition rather than a
 * remap.
 *
 * Validation mirrors core's own rules so the obvious mistakes cost no round
 * trip; it is NOT the security boundary — core re-validates every field and
 * re-derives the submitter from the token regardless.
 */
export class SubmitMyLeaveRequestUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  /**
   * @param today injectable ISO `YYYY-MM-DD` so the "not in the past" rule is
   *   deterministic in tests (`.claude/rules/tdd.md` — no real `Date.now()`).
   */
  async execute(
    input: SubmitMyLeaveRequestInput,
    today: string = todayISO(),
  ): Promise<LeaveRequestEntity> {
    // Addressing first: an unaddressable request must not reach the wire, and
    // "which student" / "which class" are different problems with different
    // copy (a missing class means the enrolment could not be resolved).
    if (input.studentMemberId.trim() === "") fail("missing-student");
    if (input.classId.trim() === "") fail("student-not-enrolled");

    const reason = input.reason.trim();
    if (reason.length === 0) fail("reason-too-short");
    if (reason.length > MAX_REASON_LENGTH) fail("reason-too-long");

    if (!ISO_DAY.test(input.startDate) || !ISO_DAY.test(input.endDate)) {
      fail("invalid-date");
    }
    // ISO `YYYY-MM-DD` compares lexicographically as a date.
    if (input.endDate < input.startDate) fail("invalid-date");
    if (input.startDate < today) fail("invalid-date");

    return this.repo.submitMyLeaveRequest(input);
  }
}

/** Local calendar date as ISO `YYYY-MM-DD` (no UTC shift). */
function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
