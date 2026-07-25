import type { StaffConductNoteEntity } from "../entities/staff-conduct-note.entity";
import type { StaffDisciplineAuthContext } from "../entities/staff-discipline-auth-context.entity";
import type { IStaffDisciplineRepository } from "../repositories/i-staff-discipline.repository";

/** INT-007 — DRAFT → SUBMITTED for `(termId, staffMemberId)`. */
export class SubmitStaffConductNoteUseCase {
  constructor(private readonly repo: IStaffDisciplineRepository) {}

  execute(
    staffMemberId: string,
    termId: string,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffConductNoteEntity> {
    return this.repo.submitStaffConductNote(staffMemberId, termId, authCtx);
  }
}
