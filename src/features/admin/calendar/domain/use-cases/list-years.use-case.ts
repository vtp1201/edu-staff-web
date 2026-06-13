import type { AcademicYear } from "../entities/academic-year.entity";
import type { ICalendarRepository } from "../repositories/i-calendar.repository";

export class ListYearsUseCase {
  constructor(private readonly repo: ICalendarRepository) {}

  /**
   * Returns the first page of academic years. The calendar screen renders a
   * bounded set of years, so callers consume the `years` array directly; the
   * cursor stays in the repository contract for future pagination.
   */
  async execute(): Promise<AcademicYear[]> {
    const page = await this.repo.listYears();
    return page.years;
  }
}
