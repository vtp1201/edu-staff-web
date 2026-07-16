import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type { GradeCell } from "../entities/grade-sheet.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradesRepository } from "../repositories/i-grades.repository";
import { validateScore } from "./validate-score.use-case";

function toFailure(err: unknown): GradesFailure {
  if (err && typeof err === "object" && "type" in err) {
    return err as GradesFailure;
  }
  return { type: "network-error" };
}

export interface SaveScoreResult {
  studentId: string;
  columnId: string;
  cell: GradeCell;
}

export class SaveScoreUseCase {
  constructor(private readonly repo: IGradesRepository) {}

  async execute(
    key: ClassSubjectTermKey,
    studentId: string,
    columnId: string,
    value: number,
    maxScore: number,
  ): Promise<SaveScoreResult | GradesFailure> {
    const validation = validateScore(value, maxScore, columnId);
    if (!validation.valid) {
      return validation.failure;
    }
    try {
      return await this.repo.saveScore(key, studentId, columnId, value);
    } catch (err) {
      return toFailure(err);
    }
  }
}
