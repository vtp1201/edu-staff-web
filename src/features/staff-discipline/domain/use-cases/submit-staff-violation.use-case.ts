import type { StaffDisciplineAuthContext } from "../entities/staff-discipline-auth-context.entity";
import type { StaffViolationEntity } from "../entities/staff-violation.entity";
import type { IStaffDisciplineRepository } from "../repositories/i-staff-discipline.repository";

/** INT-003 — DRAFT → SUBMITTED. Ownership/state are server-enforced (NFR-008). */
export class SubmitStaffViolationUseCase {
  constructor(private readonly repo: IStaffDisciplineRepository) {}

  execute(
    recordId: string,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffViolationEntity> {
    return this.repo.submitStaffViolation(recordId, authCtx);
  }
}
