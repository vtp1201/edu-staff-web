import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type { StaffGradeCell } from "../entities/grade-sheet.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradeDecisionRepository } from "../repositories/i-grade-decision.repository";

/** BE cap on `reason` (US-184: "bắt buộc, ≤500 ký tự"). */
export const MAX_REJECTION_REASON_LENGTH = 500;

function toFailure(err: unknown): GradesFailure {
  if (err && typeof err === "object" && "type" in err) {
    return err as GradesFailure;
  }
  return { type: "network-error" };
}

export interface RejectEntryResult {
  studentId: string;
  columnId: string;
  cell: StaffGradeCell;
}

/**
 * Reject (request revision on) ONE pending-approval grade cell — US-E18.44,
 * BE US-184. Mirrors `SubmitColumnScoresUseCase`'s shape but is deliberately
 * single-target: rejecting is a judgement call with a per-cell reason, so there
 * is no fan-out granularity to pick (and no bulk endpoint on the wire).
 *
 * Validates the reason locally BEFORE the call (defense in depth — BE 422s
 * anyway): non-empty after trimming and ≤500 chars. The trimmed reason is what
 * gets sent, so a whitespace-padded reason can never consume the 500-char
 * budget or be stored as blank-looking text.
 */
export class RejectColumnEntryUseCase {
  constructor(private readonly repo: IGradeDecisionRepository) {}

  async execute(
    key: ClassSubjectTermKey,
    studentId: string,
    columnId: string,
    reason: string,
  ): Promise<RejectEntryResult | GradesFailure> {
    const trimmed = reason.trim();
    if (trimmed.length === 0) {
      return { type: "rejection-reason-required" };
    }
    if (trimmed.length > MAX_REJECTION_REASON_LENGTH) {
      return { type: "rejection-reason-too-long" };
    }
    try {
      return await this.repo.rejectEntry(key, studentId, columnId, trimmed);
    } catch (err) {
      return toFailure(err);
    }
  }
}
