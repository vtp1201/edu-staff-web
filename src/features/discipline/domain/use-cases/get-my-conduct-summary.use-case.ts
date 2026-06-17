import type { ConductSummaryEntity } from "../entities/conduct-summary.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

export class GetMyConductSummaryUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(
    studentId: string,
    semester?: string,
  ): Promise<ConductSummaryEntity> {
    return this.repo.getMyConductSummary(studentId, semester);
  }
}
