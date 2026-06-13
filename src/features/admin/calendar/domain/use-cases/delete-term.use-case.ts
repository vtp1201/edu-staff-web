import type { ICalendarRepository } from "../repositories/i-calendar.repository";
import { fail, ok, type Result } from "./result";

export class DeleteTermUseCase {
  constructor(private readonly repo: ICalendarRepository) {}

  async execute(
    yearId: string,
    termId: string,
    hasGrades: boolean,
  ): Promise<Result<void>> {
    if (hasGrades) {
      return fail({
        type: "graded-term-delete",
        message: "cannot delete a term that has grade entries",
      });
    }
    await this.repo.archiveTerm(yearId, termId);
    return ok(undefined);
  }
}
