import type { LinkedStudentSummary } from "../entities/linked-student-summary.entity";
import type { ParentStudentConsent } from "../entities/parent-student-consent.entity";
import type { ParentConsentFailure } from "../failures/parent-consent.failure";
import type { IParentConsentRepository } from "../repositories/i-parent-consent.repository";
import { ok, type Result } from "./result";

/** Combined section snapshot: linked students + a consent lookup keyed by id. */
export interface LinkedStudentsWithConsents {
  students: LinkedStudentSummary[];
  /**
   * A `studentId` present in `students` but ABSENT here = consents not yet
   * resolved for that child (pending sub-state, AC-001.3). Presentation renders
   * disabled/skeleton toggles — never a guessed default.
   */
  consentByStudentId: Record<string, ParentStudentConsent>;
}

/**
 * Loads the parent's own linked students then their consents (US-E20.2,
 * INT-001 + INT-002). Combining logic lives here so the pending/empty/error
 * behavior is testable without HTTP.
 *
 * 1. `getLinkedStudents()` fails → propagate as-is (403-as-error AC-002.2 /
 *    network-error UC-003); `getConsents` never called.
 * 2. ok with `[]` → empty result (AC-002.1); `getConsents` NOT called.
 * 3. ok with ≥1 → `getConsents(ids)`; fail → propagate; ok → build the map.
 */
export class GetLinkedStudentsWithConsentsUseCase {
  constructor(private readonly repo: IParentConsentRepository) {}

  async execute(): Promise<
    Result<LinkedStudentsWithConsents, ParentConsentFailure>
  > {
    const studentsResult = await this.repo.getLinkedStudents();
    if (!studentsResult.ok) return studentsResult;

    const students = studentsResult.value;
    if (students.length === 0) {
      return ok({ students: [], consentByStudentId: {} });
    }

    const consentsResult = await this.repo.getConsents(
      students.map((s) => s.studentId),
    );
    if (!consentsResult.ok) return consentsResult;

    const consentByStudentId: Record<string, ParentStudentConsent> = {};
    for (const c of consentsResult.value) {
      consentByStudentId[c.studentId] = c;
    }
    return ok({ students, consentByStudentId });
  }
}
