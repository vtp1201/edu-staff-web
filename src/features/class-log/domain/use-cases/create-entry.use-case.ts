import type { HomeroomEntry } from "../entities/homeroom-entry.entity";
import type { ClassLogFailure } from "../failures/class-log.failure";
import type { IClassLogRepository } from "../repositories/i-class-log.repository";

export class CreateEntryUseCase {
  constructor(private readonly repo: IClassLogRepository) {}

  async execute(
    classId: string,
    entryDate: string,
    summary: string,
    notableEvents?: string,
  ): Promise<HomeroomEntry> {
    if (summary.trim().length === 0) {
      const failure: ClassLogFailure = { type: "summary-required" };
      throw failure;
    }
    return this.repo.createEntry(classId, entryDate, summary, notableEvents);
  }
}
