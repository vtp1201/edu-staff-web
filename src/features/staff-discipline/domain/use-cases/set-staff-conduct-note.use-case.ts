import {
  type SetStaffConductNoteInput,
  STAFF_CONDUCT_NOTE_MAX_LENGTH,
  STAFF_CONDUCT_RATINGS,
  type StaffConductNoteEntity,
} from "../entities/staff-conduct-note.entity";
import type { StaffDisciplineAuthContext } from "../entities/staff-discipline-auth-context.entity";
import type { StaffDisciplineFailure } from "../failures/staff-discipline.failure";
import type { IStaffDisciplineRepository } from "../repositories/i-staff-discipline.repository";

/**
 * INT-005 — set (create/overwrite) a conduct note, natural key
 * `(termId, staffMemberId)`.
 *
 * Field validation only. The APPROVED-lock PRE-check ("the form must not even
 * open", AC-007.4) is a PRESENTATION concern (row trigger-render boundary); this
 * use-case owns only the server backstop — a `{ type: "locked" }` failure thrown
 * by the repository on a stale/bypassed request (AC-007.5) simply propagates.
 */
export class SetStaffConductNoteUseCase {
  constructor(private readonly repo: IStaffDisciplineRepository) {}

  async execute(
    input: SetStaffConductNoteInput,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffConductNoteEntity> {
    if (!STAFF_CONDUCT_RATINGS.includes(input.rating)) {
      const failure: StaffDisciplineFailure = { type: "invalid-rating" };
      throw failure;
    }
    if (input.note.trim().length === 0) {
      const failure: StaffDisciplineFailure = {
        type: "validation",
        fields: [{ field: "note", reason: "required" }],
      };
      throw failure;
    }
    if (input.note.length > STAFF_CONDUCT_NOTE_MAX_LENGTH) {
      const failure: StaffDisciplineFailure = {
        type: "validation",
        fields: [{ field: "note", reason: "too-long" }],
      };
      throw failure;
    }
    if (input.termId.trim().length === 0) {
      const failure: StaffDisciplineFailure = {
        type: "validation",
        fields: [{ field: "termId", reason: "required" }],
      };
      throw failure;
    }
    return this.repo.setStaffConductNote(input, authCtx);
  }
}
