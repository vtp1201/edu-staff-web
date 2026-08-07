import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type { StaffGradeCell } from "../entities/grade-sheet.entity";

/**
 * The APPROVER's per-cell decision port (ADMIN/MANAGER) — the two terminal
 * outcomes of a `PENDING_APPROVAL` grade entry:
 *
 * - `approveEntry` → `PENDING_APPROVAL → PUBLISHED`
 *   (`POST .../grades/{studentId}/columns/{columnId}/approve`, no body);
 * - `rejectEntry` → `PENDING_APPROVAL → DRAFT` with a required reason
 *   (`POST .../grades/{studentId}/columns/{columnId}/reject`).
 *
 * RENAMED in US-E18.46 from `IGradeRejectionRepository`: it is no longer just
 * "reject". The three reasons it was split out of {@link IGradesRepository} in
 * US-E18.44 apply to approve VERBATIM, which is precisely why approve joins this
 * port instead of getting a parallel one-method interface:
 *
 * 1. **Actor split.** `IGradesRepository` is the TEACHER-entry contract
 *    (enter → submit). Approve AND reject are APPROVER capabilities a
 *    teacher-entry surface must never be able to call — the same reasoning that
 *    already put `lockTerm` on {@link IGradesTermRepository}.
 * 2. **Smallest port (DIP).** Both methods are consumed by ADMIN/MANAGER
 *    use-cases only; every `IGradesRepository` test double stays untouched.
 * 3. **Capability-as-presence.** The DI factory hands this port out only where
 *    the actor is authorized, which is what the approver VM's action props key
 *    off.
 *
 * Approve and reject share ALL THREE (same BE gate `isAdminOrManager`, same
 * per-cell `(key, studentId, columnId)` addressing, same lifecycle state they
 * consume) — so splitting them would add a port without adding a distinction.
 *
 * The tenant-wide DISCOVERY read that finds cells to decide on lives on a
 * SEPARATE port ({@link IPendingApprovalRepository}): it is addressed
 * tenant-wide (no `ClassSubjectTermKey` at all), it is a paginated read rather
 * than a mutation, and its concrete implementation needs none of the
 * scheme/publish-mode construction the per-cell repository does.
 *
 * Throwing repository (matches the `IGradesRepository` convention): success
 * returns the value, failures throw a `GradesFailure`.
 */
export interface IGradeDecisionRepository {
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

  /**
   * Approve ONE pending cell (US-E18.46, BE `ApproveGradeUseCase`). Takes NO
   * reason and sends NO body — approval is an unqualified "yes", so there is
   * deliberately no text field to force into it (mirrors the bodyless
   * `submit`/`lock` posts).
   *
   * @returns the updated cell — `PUBLISHED`.
   */
  approveEntry(
    key: ClassSubjectTermKey,
    studentId: string,
    columnId: string,
  ): Promise<{ studentId: string; columnId: string; cell: StaffGradeCell }>;
}
