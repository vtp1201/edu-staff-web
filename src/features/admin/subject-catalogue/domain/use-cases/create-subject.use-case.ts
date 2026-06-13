import type { CreateSubjectInput, Subject } from "../entities/subject.entity";
import type { SubjectCatalogueFailure } from "../failures/subject-catalogue.failure";
import type { ISubjectCatalogueRepository } from "../repositories/i-subject-catalogue.repository";
import type { Result } from "./result";
import { validateSubjectCode } from "./validate-subject-code.use-case";

export class CreateSubjectUseCase {
  constructor(private readonly repo: ISubjectCatalogueRepository) {}

  async execute(
    input: CreateSubjectInput,
  ): Promise<Result<Subject, SubjectCatalogueFailure>> {
    const codeResult = validateSubjectCode(input.code);
    if (!codeResult.ok) return codeResult;
    return this.repo.createSubject(input);
  }
}
