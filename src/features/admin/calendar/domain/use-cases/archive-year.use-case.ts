import type { ICalendarRepository } from "../repositories/i-calendar.repository";
import { ok, type Result } from "./result";

export class ArchiveYearUseCase {
  constructor(private readonly repo: ICalendarRepository) {}

  async execute(yearId: string): Promise<Result<void>> {
    await this.repo.archiveYear(yearId);
    return ok(undefined);
  }
}
