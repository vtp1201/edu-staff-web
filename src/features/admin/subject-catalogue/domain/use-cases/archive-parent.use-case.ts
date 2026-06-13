import type { SubjectParent } from "../entities/subject-parent.entity";
import type { SubjectCatalogueFailure } from "../failures/subject-catalogue.failure";
import type { ISubjectCatalogueRepository } from "../repositories/i-subject-catalogue.repository";
import { fail, type Result } from "./result";

export class ArchiveParentUseCase {
  constructor(private readonly repo: ISubjectCatalogueRepository) {}

  async execute(
    id: string,
    parent: SubjectParent,
  ): Promise<Result<void, SubjectCatalogueFailure>> {
    if (parent.activeChildCount > 0) {
      return fail({ type: "archive-blocked-parent" });
    }
    return this.repo.archiveParent(id);
  }
}
