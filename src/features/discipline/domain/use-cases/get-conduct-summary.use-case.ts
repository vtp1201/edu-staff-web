import type { ConductSummaryEntity } from "../entities/conduct-summary.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

export class GetConductSummaryUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(params: {
    classId?: string;
    semester?: string;
  }): Promise<ConductSummaryEntity[]> {
    return this.repo.getConductSummary(params);
  }
}
