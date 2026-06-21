import type { ChildEntity } from "../entities/child.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

/** Returns the children linked to the current parent account (US-E09.4). */
export class GetChildrenUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(): Promise<ChildEntity[]> {
    return this.repo.getChildren();
  }
}
