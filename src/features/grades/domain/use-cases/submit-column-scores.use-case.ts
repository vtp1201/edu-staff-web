import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradesRepository } from "../repositories/i-grades.repository";

function toFailure(err: unknown): GradesFailure {
  if (err && typeof err === "object" && "type" in err) {
    return err as GradesFailure;
  }
  return { type: "network-error" };
}

export interface SubmitTarget {
  studentId: string;
  columnId: string;
}

export interface SubmitScoresResult {
  /** targets whose submit call succeeded */
  submitted: SubmitTarget[];
  /** targets whose submit call failed — NEVER silently swallowed */
  failed: Array<{ target: SubmitTarget; failure: GradesFailure }>;
}

/**
 * Replaces `PublishGradesUseCase` (US-E18.12, ADR 0054 §2.2) — no bulk submit
 * exists on the wire, only `POST .../grades/{studentId}/columns/{columnId}/
 * submit`. This use-case fans out `submit` over a caller-supplied set of
 * (studentId, columnId) targets — a 1-element list for "submit this cell", the
 * row's DRAFT cells for "submit this row", or every DRAFT cell in the visible
 * sheet for "submit all drafts". No separate use-case per granularity.
 */
export class SubmitColumnScoresUseCase {
  constructor(private readonly repo: IGradesRepository) {}

  async execute(
    key: ClassSubjectTermKey,
    targets: SubmitTarget[],
  ): Promise<SubmitScoresResult> {
    const submitted: SubmitTarget[] = [];
    const failed: SubmitScoresResult["failed"] = [];
    // Sequential, NOT Promise.all — every target is attempted regardless of
    // earlier failures (no short-circuit); this also keeps failure
    // aggregation deterministic in the order shown in the UI.
    for (const target of targets) {
      try {
        await this.repo.submitScore(key, target.studentId, target.columnId);
        submitted.push(target);
      } catch (err) {
        failed.push({ target, failure: toFailure(err) });
      }
    }
    return { submitted, failed };
  }
}
