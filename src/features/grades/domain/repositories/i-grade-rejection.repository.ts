import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type { StaffGradeCell } from "../entities/grade-sheet.entity";

/**
 * Per-cell reject / request-revision (US-E18.44, BE US-184) —
 * `POST .../grades/{studentId}/columns/{columnId}/reject` (ADMIN/MANAGER),
 * transitioning `PENDING_APPROVAL → DRAFT`.
 *
 * Kept as its OWN narrow interface rather than a 4th method on
 * {@link IGradesRepository}, for three reasons:
 *
 * 1. **Actor split.** `IGradesRepository` is the TEACHER-entry contract
 *    (enter → submit). Reject is an APPROVER (ADMIN/MANAGER) capability that a
 *    teacher-entry surface must never be able to call — the same reasoning that
 *    already put `lockTerm` on {@link IGradesTermRepository} instead.
 * 2. **Smallest port (DIP).** `RejectColumnEntryUseCase` needs exactly one
 *    method; depending on the 3-method entry contract would force every fake to
 *    stub methods it never answers (and would make ~a dozen existing
 *    `IGradesRepository` test doubles fail to type-check for no behavioral
 *    reason).
 * 3. **Capability-as-presence.** The DI factory can hand this port out only
 *    where the actor is authorized, which is what the presentation layer's
 *    optional `rejectEntryAction` prop keys off.
 *
 * Unlike `IGradesTermRepository` the addressing here IS per-cell (studentId +
 * columnId), same as `submitScore` — the split is by ACTOR/capability, not by
 * granularity. Both interfaces are implemented by the same concrete
 * `GradesRepository`/`MockGradesRepository` class.
 *
 * Throwing repository (matches the `IGradesRepository` convention): success
 * returns the value, failures throw a `GradesFailure`.
 */
export interface IGradeRejectionRepository {
  /**
   * @param reason staff free text, REQUIRED, ≤500 chars (already trimmed by the
   *   use-case). BE 422s `GRADE_REJECTION_REASON_REQUIRED` on a blank one.
   * @returns the updated cell — `DRAFT` status plus the recorded rejection.
   */
  rejectEntry(
    key: ClassSubjectTermKey,
    studentId: string,
    columnId: string,
    reason: string,
  ): Promise<{ studentId: string; columnId: string; cell: StaffGradeCell }>;
}
