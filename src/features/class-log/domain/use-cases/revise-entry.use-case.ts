import type { HomeroomEntry } from "../entities/homeroom-entry.entity";
import type { IClassLogRepository } from "../repositories/i-class-log.repository";

export class ReviseEntryUseCase {
  constructor(private readonly repo: IClassLogRepository) {}

  async execute(classId: string, entryId: string): Promise<HomeroomEntry> {
    return this.repo.reviseEntry(classId, entryId);
  }
}
