import type { ILmsRepository } from "../repositories/i-lms.repository";
import { type Result, runCatching } from "./result";

/**
 * Hard-delete a DOCUMENT item. LESSON/ASSIGNMENT tiles die with the entity
 * they point at, so addressing one here is `not-document` — the UI therefore
 * mounts no delete affordance for those kinds at all.
 */
export class DeleteItemUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(courseId: string, itemId: string): Promise<Result<void>> {
    return runCatching(() => this.repo.deleteItem(courseId, itemId));
  }
}
