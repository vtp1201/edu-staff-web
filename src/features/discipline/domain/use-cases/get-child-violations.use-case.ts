import type { ViolationEntity } from "../entities/violation.entity";
import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

function fail(type: DisciplineFailure["type"]): never {
  const failure: DisciplineFailure = { type };
  throw failure;
}

/** Returns the violations for one of the parent's children (US-E09.4). */
export class GetChildViolationsUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(childId: string): Promise<ViolationEntity[]> {
    if (!childId) fail("invalid-child");
    return this.repo.getChildViolations(childId);
  }
}
