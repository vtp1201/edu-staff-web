import type { GradeBook } from "../entities/grade-book.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradeBookRepository } from "../repositories/i-grade-book.repository";

function toFailure(err: unknown): GradesFailure {
  if (err && typeof err === "object" && "type" in err) {
    return err as GradesFailure;
  }
  return { type: "network-error" };
}

/**
 * Parent-linked child self-view (US-E18.12, ADR 0054) — same shape as
 * {@link GetMyGradesUseCase}: `GET /members/{childId}/grades?year=` returns
 * every subject for the year, once a childId is already known (child-switcher
 * itself stays mock — see `get-child-list.use-case.ts`, untouched).
 */
export class GetChildGradesUseCase {
  constructor(private readonly repo: IGradeBookRepository) {}

  async execute(
    childId: string,
    academicYearLabel: string,
  ): Promise<GradeBook[] | GradesFailure> {
    try {
      return await this.repo.getChildGrades(childId, academicYearLabel);
    } catch (err) {
      return toFailure(err);
    }
  }
}
