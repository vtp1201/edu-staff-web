import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type { GradeSheet } from "../entities/grade-sheet.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradesRepository } from "../repositories/i-grades.repository";

function toFailure(err: unknown): GradesFailure {
  if (err && typeof err === "object" && "type" in err) {
    return err as GradesFailure;
  }
  return { type: "network-error" };
}

export class GetGradeSheetUseCase {
  constructor(private readonly repo: IGradesRepository) {}

  async execute(key: ClassSubjectTermKey): Promise<GradeSheet | GradesFailure> {
    try {
      return await this.repo.getGradeSheet(key);
    } catch (err) {
      return toFailure(err);
    }
  }
}
