import type { LinkedStudentSummary } from "../entities/linked-student-summary.entity";
import type { ParentStudentConsent } from "../entities/parent-student-consent.entity";
import type { ParentConsentFailure } from "../failures/parent-consent.failure";
import type { Result } from "../use-cases/result";

/** The 3 notification-consent categories (INT-003 recommended per-toggle shape). */
export type ConsentCategory = "discipline" | "absence" | "grades";

/**
 * One-category-at-a-time update payload (INT-003 recommended shape). The single
 * `(studentId, category)` scope is enforced structurally by this input type —
 * flipping one toggle can never affect another category or child (AC-004.2).
 */
export interface UpdateConsentInput {
  studentId: string;
  category: ConsentCategory;
  enabled: boolean;
}

/**
 * `IParentConsentRepository` — two read methods map 1:1 to INT-001/INT-002 so
 * the combine/race-handling logic lives in the use-case (testable without
 * HTTP); `updateConsent` maps to INT-003's per-toggle shape.
 *
 * Every read/write is scoped server-side to the authenticated parent's own
 * resolved memberId — NO method takes a parent id argument, so a client cannot
 * request another parent's data by construction (NFR-007).
 */
export interface IParentConsentRepository {
  getLinkedStudents(): Promise<
    Result<LinkedStudentSummary[], ParentConsentFailure>
  >;
  getConsents(
    studentIds: string[],
  ): Promise<Result<ParentStudentConsent[], ParentConsentFailure>>;
  updateConsent(
    input: UpdateConsentInput,
  ): Promise<Result<ParentStudentConsent, ParentConsentFailure>>;
}
