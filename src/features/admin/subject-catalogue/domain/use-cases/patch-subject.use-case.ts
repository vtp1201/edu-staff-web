import type { PatchSubjectInput, Subject } from "../entities/subject.entity";
import type { SubjectCatalogueFailure } from "../failures/subject-catalogue.failure";
import type { ISubjectCatalogueRepository } from "../repositories/i-subject-catalogue.repository";
import type { Result } from "./result";
import { validateSubjectCode } from "./validate-subject-code.use-case";

export class PatchSubjectUseCase {
  constructor(private readonly repo: ISubjectCatalogueRepository) {}

  async execute(
    id: string,
    input: PatchSubjectInput,
  ): Promise<Result<Subject, SubjectCatalogueFailure>> {
    if (input.code !== undefined) {
      const codeResult = validateSubjectCode(input.code);
      if (!codeResult.ok) return codeResult;
    }
    return this.repo.patchSubject(id, input);
  }
}
