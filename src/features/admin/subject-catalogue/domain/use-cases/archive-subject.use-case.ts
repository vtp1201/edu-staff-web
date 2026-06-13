import type { Subject } from "../entities/subject.entity";
import type { SubjectCatalogueFailure } from "../failures/subject-catalogue.failure";
import type { ISubjectCatalogueRepository } from "../repositories/i-subject-catalogue.repository";
import { fail, type Result } from "./result";

export class ArchiveSubjectUseCase {
  constructor(private readonly repo: ISubjectCatalogueRepository) {}

  async execute(
    id: string,
    subject: Subject,
  ): Promise<Result<void, SubjectCatalogueFailure>> {
    if (subject.inUse) {
      return fail({ type: "archive-blocked-subject" });
    }
    return this.repo.archiveSubject(id);
  }
}
