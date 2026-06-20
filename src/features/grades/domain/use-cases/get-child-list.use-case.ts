import type { ChildSummary } from "../entities/grade-book.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradeBookRepository } from "../repositories/i-grade-book.repository";

export class GetChildListUseCase {
  constructor(private readonly repo: IGradeBookRepository) {}

  async execute(): Promise<
    { ok: true; data: ChildSummary[] } | { ok: false; error: GradesFailure }
  > {
    try {
      const children = await this.repo.getChildList();
      return { ok: true, data: children };
    } catch (err) {
      if (typeof err === "object" && err !== null && "type" in err) {
        return { ok: false, error: err as GradesFailure };
      }
      return { ok: false, error: { type: "unknown" } };
    }
  }
}
