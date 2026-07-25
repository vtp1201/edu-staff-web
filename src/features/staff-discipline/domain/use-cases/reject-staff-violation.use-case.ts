import type { StaffDisciplineAuthContext } from "../entities/staff-discipline-auth-context.entity";
import type {
  RejectStaffViolationInput,
  StaffViolationEntity,
} from "../entities/staff-violation.entity";
import type { StaffDisciplineFailure } from "../failures/staff-discipline.failure";
import type { IStaffDisciplineRepository } from "../repositories/i-staff-discipline.repository";
import { isRejectionReasonLongEnough } from "./is-rejection-reason-long-enough";

/**
 * INT-004 (reject) — SUBMITTED → REJECTED. Layer 1 of the two-layer reason
 * validation (client ≥10 chars, AC-005.1); the server's non-empty guard
 * (AC-005.3) is a distinct layer enforced by the repository.
 */
export class RejectStaffViolationUseCase {
  constructor(private readonly repo: IStaffDisciplineRepository) {}

  async execute(
    input: RejectStaffViolationInput,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffViolationEntity> {
    if (!isRejectionReasonLongEnough(input.rejectionReason)) {
      const failure: StaffDisciplineFailure = { type: "missing-reject-reason" };
      throw failure;
    }
    return this.repo.rejectStaffViolation(input, authCtx);
  }
}
