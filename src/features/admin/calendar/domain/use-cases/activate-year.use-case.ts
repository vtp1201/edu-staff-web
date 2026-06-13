import type { AcademicYear } from "../entities/academic-year.entity";
import type { ICalendarRepository } from "../repositories/i-calendar.repository";
import { ok, type Result } from "./result";

export class ActivateYearUseCase {
  constructor(private readonly repo: ICalendarRepository) {}

  async execute(yearId: string): Promise<Result<AcademicYear>> {
    const year = await this.repo.activateYear(yearId);
    return ok(year);
  }
}
