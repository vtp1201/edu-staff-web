import type { ViolationEntity } from "../entities/violation.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

export class GetViolationsUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(params: {
    classId?: string;
    semester?: string;
  }): Promise<ViolationEntity[]> {
    return this.repo.getViolations(params);
  }
}
