import type { AcademicYear } from "../entities/academic-year.entity";
import type { ICalendarRepository } from "../repositories/i-calendar.repository";

export class ListYearsUseCase {
  constructor(private readonly repo: ICalendarRepository) {}

  execute(): Promise<AcademicYear[]> {
    return this.repo.listYears();
  }
}
