import type { AcademicYear } from "../entities/academic-year.entity";
import type { ICalendarRepository } from "../repositories/i-calendar.repository";
import { fail, ok, type Result } from "./result";

interface CreateYearInput {
  label: string;
  isActive: boolean;
}

export class CreateYearUseCase {
  constructor(private readonly repo: ICalendarRepository) {}

  async execute(input: CreateYearInput): Promise<Result<AcademicYear>> {
    const label = input.label.trim();
    if (!label) {
      return fail({ type: "unknown", message: "label is required" });
    }
    const year = await this.repo.createYear({
      label,
      isActive: input.isActive,
    });
    return ok(year);
  }
}
