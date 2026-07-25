import type {
  StudentAbsenceEntity,
  StudentAbsenceKey,
} from "../entities/student-absence.entity";
import type { IStudentAbsenceRepository } from "../repositories/i-student-absence.repository";

/**
 * INT-004 — one-way `RECORDED` → `FLAGGED_UNEXCUSED` (FR-005).
 *
 * Deliberately a single round trip and nothing else:
 *  - the irreversible-confirm gate is a PRESENTATION concern (AC-005.2);
 *  - the "no optimistic client-only flip" rule is a STATE concern (AC-005.3 —
 *    the mutation has no `onMutate` and never `setQueryData`s the row);
 *  - the principal-tier authorization re-check is a REPOSITORY concern
 *    (NFR-008 pt.2) — this use-case must NOT pre-filter it away, or the
 *    server-side denial would stop being the thing under test.
 *
 * There is no paired `unflag` use-case: the transition is terminal (FR-006).
 */
export class FlagStudentAbsenceUseCase {
  constructor(private readonly repo: IStudentAbsenceRepository) {}

  async execute(key: StudentAbsenceKey): Promise<StudentAbsenceEntity> {
    return this.repo.flagAbsence(key);
  }
}
