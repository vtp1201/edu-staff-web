import type { StudentAbsenceEntity } from "../entities/student-absence.entity";
import type {
  IStudentAbsenceRepository,
  ListStudentAbsencesParams,
} from "../repositories/i-student-absence.repository";

/**
 * INT-002 — role-scoped absence list.
 *
 * A deliberate passthrough: the SERVER (mock repository today) is the scope
 * boundary — it pins a `teacher` to their own homeroom and ignores any forged
 * `classId`, and a `principal` reads schoolwide with an optional class filter
 * (NFR-008). Re-filtering here would turn a server-enforced scope into a
 * client-side one, which is exactly what FR-008 forbids.
 */
export class ListStudentAbsencesUseCase {
  constructor(private readonly repo: IStudentAbsenceRepository) {}

  async execute(
    params: ListStudentAbsencesParams,
  ): Promise<StudentAbsenceEntity[]> {
    return this.repo.listAbsences(params);
  }
}
