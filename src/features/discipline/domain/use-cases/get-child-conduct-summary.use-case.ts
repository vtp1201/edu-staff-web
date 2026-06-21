import type { ConductSummaryEntity } from "../entities/conduct-summary.entity";
import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

function fail(type: DisciplineFailure["type"]): never {
  const failure: DisciplineFailure = { type };
  throw failure;
}

/** Returns the conduct summary for one of the parent's children (US-E09.4). */
export class GetChildConductSummaryUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(childId: string): Promise<ConductSummaryEntity> {
    if (!childId) fail("invalid-child");
    return this.repo.getChildConductSummary(childId);
  }
}
