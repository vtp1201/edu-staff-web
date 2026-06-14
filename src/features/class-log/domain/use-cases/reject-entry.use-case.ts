import type { HomeroomEntry } from "../entities/homeroom-entry.entity";
import type { IClassLogRepository } from "../repositories/i-class-log.repository";

export class RejectEntryUseCase {
  constructor(private readonly repo: IClassLogRepository) {}

  async execute(
    classId: string,
    entryId: string,
    reason?: string,
  ): Promise<HomeroomEntry> {
    return this.repo.rejectEntry(classId, entryId, reason);
  }
}
