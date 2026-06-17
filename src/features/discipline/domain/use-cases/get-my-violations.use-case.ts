import type { ViolationEntity } from "../entities/violation.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

export class GetMyViolationsUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(studentId: string): Promise<ViolationEntity[]> {
    return this.repo.getMyViolations(studentId);
  }
}
