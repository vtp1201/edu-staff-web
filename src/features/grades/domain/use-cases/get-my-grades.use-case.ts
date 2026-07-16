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
 * Student self-view (US-E18.12, ADR 0054) — `GET /members/{memberId}/grades
 * ?year=` returns EVERY subject for the whole academic year in one call, so
 * this returns an array of per-subject `GradeBook`s. Term narrowing (if the
 * UI still wants a single-term view) is a client-side filter over the array.
 */
export class GetMyGradesUseCase {
  constructor(private readonly repo: IGradeBookRepository) {}

  async execute(
    studentMemberId: string,
    academicYearLabel: string,
  ): Promise<GradeBook[] | GradesFailure> {
    try {
      return await this.repo.getMyGrades(studentMemberId, academicYearLabel);
    } catch (err) {
      return toFailure(err);
    }
  }
}
