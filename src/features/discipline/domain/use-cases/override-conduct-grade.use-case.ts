import type {
  ConductGrade,
  ConductSummaryEntity,
} from "../entities/conduct-summary.entity";
import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

const VALID_GRADES: ReadonlySet<ConductGrade> = new Set([
  "excellent",
  "good",
  "average",
  "poor",
]);

function fail(type: DisciplineFailure["type"]): never {
  const failure: DisciplineFailure = { type };
  throw failure;
}

export class OverrideConductGradeUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(
    studentId: string,
    grade: ConductGrade,
    note: string,
  ): Promise<ConductSummaryEntity> {
    if (!VALID_GRADES.has(grade)) fail("invalid-conduct-grade");
    if (!note.trim()) fail("missing-description");
    return this.repo.overrideConductGrade(studentId, grade, note);
  }
}
