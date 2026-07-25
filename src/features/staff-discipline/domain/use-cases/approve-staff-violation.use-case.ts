import type { StaffDisciplineAuthContext } from "../entities/staff-discipline-auth-context.entity";
import type { StaffViolationEntity } from "../entities/staff-violation.entity";
import type { IStaffDisciplineRepository } from "../repositories/i-staff-discipline.repository";

/**
 * INT-004 (approve) — SUBMITTED → APPROVED. `selfApproved` is a read-derived
 * field on the returned entity (ADR 0073) — computed once at the mapper
 * boundary, NEVER recomputed here.
 */
export class ApproveStaffViolationUseCase {
  constructor(private readonly repo: IStaffDisciplineRepository) {}

  execute(
    recordId: string,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffViolationEntity> {
    return this.repo.approveStaffViolation(recordId, authCtx);
  }
}
