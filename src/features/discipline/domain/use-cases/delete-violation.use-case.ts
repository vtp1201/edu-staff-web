import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

function fail(type: DisciplineFailure["type"]): never {
  const failure: DisciplineFailure = { type };
  throw failure;
}

export class DeleteViolationUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(id: string): Promise<void> {
    if (!id.trim()) fail("not-found");
    await this.repo.deleteViolation(id);
  }
}
