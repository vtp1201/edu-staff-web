import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type { StaffGradeCell } from "../entities/grade-sheet.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradeDecisionRepository } from "../repositories/i-grade-decision.repository";

function toFailure(err: unknown): GradesFailure {
  if (err && typeof err === "object" && "type" in err) {
    return err as GradesFailure;
  }
  return { type: "network-error" };
}

export interface ApproveEntryResult {
  studentId: string;
  columnId: string;
  cell: StaffGradeCell;
}

/**
 * Approve (publish) ONE `PENDING_APPROVAL` grade cell — US-E18.46, BE
 * `ApproveGradeUseCase`. The mirror of {@link RejectColumnEntryUseCase} minus
 * its reason handling: approve sends no body, so there is nothing to validate
 * client-side and this use-case is purely the failure boundary (thrown
 * `GradesFailure` → returned value) that keeps `try/catch` out of the actions.
 *
 * Failure set is NARROWER than reject's (checked against `approve_grade.go` +
 * `GradeEntry.Approve()`): `forbidden` (403, not ADMIN/MANAGER),
 * `not-found` (404), `not-pending-approval` (409, the cell moved on — e.g. a
 * colleague approved or rejected it first). There is no reason-shaped 422 here.
 */
export class ApproveColumnEntryUseCase {
  constructor(private readonly repo: IGradeDecisionRepository) {}

  async execute(
    key: ClassSubjectTermKey,
    studentId: string,
    columnId: string,
  ): Promise<ApproveEntryResult | GradesFailure> {
    try {
      return await this.repo.approveEntry(key, studentId, columnId);
    } catch (err) {
      return toFailure(err);
    }
  }
}
