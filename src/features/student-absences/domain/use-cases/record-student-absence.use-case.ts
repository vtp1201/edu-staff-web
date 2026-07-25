import {
  type RecordStudentAbsenceInput,
  STUDENT_ABSENCE_REASON_MAX_LENGTH,
  type StudentAbsenceEntity,
} from "../entities/student-absence.entity";
import { studentAbsenceFailure } from "../failures/student-absence.failure";
import type { IStudentAbsenceRepository } from "../repositories/i-student-absence.repository";
import { isBareCalendarDate, isFutureDate } from "./is-future-date";

/**
 * INT-001 — record a new absence (`state="RECORDED"`).
 *
 * Client-side defense-in-depth mirroring the server's `ABSENCE_INVALID_DATE` /
 * `ABSENCE_INVALID_INPUT`; the server (mock repository today) stays
 * authoritative and its failures simply propagate.
 *
 * `today` is CONSTRUCTOR-injected (never `Date.now()`) so the future-date guard
 * is deterministic in tests (`.claude/rules/tdd.md`, NFR-009).
 *
 * The duplicate-date pre-check is deliberately NOT here: it reads the currently
 * loaded list, which is a presentation concern (`isDuplicateAbsence`, FR-003).
 * Authorization is likewise not here — the repository is the enforcement
 * boundary (NFR-008).
 */
export class RecordStudentAbsenceUseCase {
  constructor(
    private readonly repo: IStudentAbsenceRepository,
    private readonly today: string,
  ) {}

  async execute(
    input: RecordStudentAbsenceInput,
  ): Promise<StudentAbsenceEntity> {
    if (
      input.classId.trim().length === 0 ||
      input.studentMemberId.trim().length === 0
    ) {
      throw studentAbsenceFailure({ type: "invalid-input" });
    }
    // Format first: a malformed value is `invalid-input`, only a well-formed
    // future date is `invalid-date` (they render different copy).
    if (!isBareCalendarDate(input.date)) {
      throw studentAbsenceFailure({ type: "invalid-input" });
    }
    if (isFutureDate(input.date, this.today)) {
      throw studentAbsenceFailure({ type: "invalid-date" });
    }
    if (
      input.reason !== undefined &&
      input.reason.length > STUDENT_ABSENCE_REASON_MAX_LENGTH
    ) {
      throw studentAbsenceFailure({ type: "invalid-input" });
    }
    return this.repo.recordAbsence(input);
  }
}
