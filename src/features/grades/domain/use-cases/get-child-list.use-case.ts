import type { ChildSummary } from "../entities/grade-book.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IChildListRepository } from "../repositories/i-grade-book.repository";

export class GetChildListUseCase {
  /**
   * Narrowed to the roster slice (US-E18.33): the real child-list source is a
   * `core` + IAM composition that has no business answering the three grade
   * reads. The full mock repository still satisfies it structurally.
   */
  constructor(private readonly repo: IChildListRepository) {}

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
