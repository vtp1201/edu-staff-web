import {
  type EditStudentAbsenceInput,
  STUDENT_ABSENCE_REASON_MAX_LENGTH,
  type StudentAbsenceEntity,
} from "../entities/student-absence.entity";
import { studentAbsenceFailure } from "../failures/student-absence.failure";
import type { IStudentAbsenceRepository } from "../repositories/i-student-absence.repository";
import { isBareCalendarDate } from "./is-future-date";

/**
 * INT-003 — PATCH `reason`/`excused` only (FR-004).
 *
 * The natural key (`classId`/`studentMemberId`/`date`) is IDENTITY, carried on
 * the path/query and never editable. The caller passes ONLY the field(s) that
 * actually changed and this use-case forwards the input UNWIDENED — it never
 * fills in an unchanged echo, which is what makes AC-004.2 hold end-to-end.
 *
 * No future-date guard here: the date is immutable in edit mode, so there is
 * nothing to re-validate (and offering one would imply the field is editable).
 */
export class EditStudentAbsenceUseCase {
  constructor(private readonly repo: IStudentAbsenceRepository) {}

  async execute(input: EditStudentAbsenceInput): Promise<StudentAbsenceEntity> {
    if (
      input.classId.trim().length === 0 ||
      input.studentMemberId.trim().length === 0 ||
      !isBareCalendarDate(input.date)
    ) {
      throw studentAbsenceFailure({ type: "invalid-input" });
    }
    const patchesReason = input.reason !== undefined;
    const patchesExcused = input.excused !== undefined;
    if (!patchesReason && !patchesExcused) {
      // An empty PATCH is meaningless — mirrors ABSENCE_INVALID_INPUT (422).
      throw studentAbsenceFailure({ type: "invalid-input" });
    }
    if (
      patchesReason &&
      (input.reason as string).length > STUDENT_ABSENCE_REASON_MAX_LENGTH
    ) {
      throw studentAbsenceFailure({ type: "invalid-input" });
    }
    return this.repo.editAbsence(input);
  }
}
