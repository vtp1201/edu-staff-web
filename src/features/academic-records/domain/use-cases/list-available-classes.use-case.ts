import type { ClassOption, Term } from "../entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../repositories/i-academic-records-seal.repository";

/** Query use-case: classes with a sealable batch for the (term, year) selector. */
export class ListAvailableClassesUseCase {
  constructor(private readonly repo: IAcademicRecordsSealRepository) {}

  execute(filter: {
    term: Term;
    year: string;
  }): Promise<SealResult<ClassOption[]>> {
    return this.repo.listAvailableClasses(filter);
  }
}
