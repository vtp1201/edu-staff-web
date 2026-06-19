import type { GradeBook } from "../entities/grade-book.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradeBookRepository } from "../repositories/i-grade-book.repository";

function toFailure(err: unknown): GradesFailure {
  if (err && typeof err === "object" && "type" in err) {
    return err as GradesFailure;
  }
  return { type: "network-error" };
}

export class GetChildGradesUseCase {
  constructor(private readonly repo: IGradeBookRepository) {}

  async execute(
    childId: string,
    term: string,
  ): Promise<GradeBook | GradesFailure> {
    try {
      return await this.repo.getChildGrades(childId, term);
    } catch (err) {
      return toFailure(err);
    }
  }
}
