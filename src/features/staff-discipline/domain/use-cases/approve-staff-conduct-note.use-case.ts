import type { StaffConductNoteEntity } from "../entities/staff-conduct-note.entity";
import type { StaffDisciplineAuthContext } from "../entities/staff-discipline-auth-context.entity";
import type { IStaffDisciplineRepository } from "../repositories/i-staff-discipline.repository";

/**
 * INT-008 (approve) — SUBMITTED → APPROVED. Once APPROVED the record is
 * permanently locked against INT-005 (ADR 0074, AC-008.9) — enforced by the
 * repository, no extra wiring. `selfApproved` arrives read-derived on the entity.
 */
export class ApproveStaffConductNoteUseCase {
  constructor(private readonly repo: IStaffDisciplineRepository) {}

  execute(
    staffMemberId: string,
    termId: string,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffConductNoteEntity> {
    return this.repo.approveStaffConductNote(staffMemberId, termId, authCtx);
  }
}
