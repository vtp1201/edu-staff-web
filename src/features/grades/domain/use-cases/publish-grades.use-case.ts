import type { StudentScoreRow } from "../entities/grade-sheet.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradesRepository } from "../repositories/i-grades.repository";

function toFailure(err: unknown): GradesFailure {
  if (err && typeof err === "object" && "type" in err) {
    return err as GradesFailure;
  }
  return { type: "network-error" };
}

/** true when at least one column score on the row is still missing */
function hasMissingScore(row: StudentScoreRow): boolean {
  return Object.values(row.scores).some((s) => s === null);
}

export class PublishGradesUseCase {
  constructor(private readonly repo: IGradesRepository) {}

  async execute(
    csId: string,
    term: string,
    rows: StudentScoreRow[],
  ): Promise<{ ok: true } | GradesFailure> {
    // Precheck: cannot publish while any student has unfilled columns.
    if (rows.some(hasMissingScore)) {
      return { type: "incomplete-scores" };
    }
    try {
      await this.repo.publishGrades(csId, term);
      return { ok: true };
    } catch (err) {
      return toFailure(err);
    }
  }
}
