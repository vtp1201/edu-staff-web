import type { StaffDisciplineAuthContext } from "../entities/staff-discipline-auth-context.entity";
import type { StaffViolationEntity } from "../entities/staff-violation.entity";
import type { IStaffDisciplineRepository } from "../repositories/i-staff-discipline.repository";

/**
 * INT-002. Pure delegation: the `teacher` self-scope is a SERVER concern
 * enforced by the repository (NFR-008 pt. 3) — deliberately NOT re-checked
 * here, since the domain cannot authoritatively make that call.
 */
export class ListStaffViolationsUseCase {
  constructor(private readonly repo: IStaffDisciplineRepository) {}

  execute(
    params: { staffMemberId?: string },
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffViolationEntity[]> {
    return this.repo.listStaffViolations(params, authCtx);
  }
}
