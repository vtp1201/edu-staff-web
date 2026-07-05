import type {
  SealBatchKey,
  SealedStudentOption,
} from "../entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../repositories/i-academic-records-seal.repository";

/** Query use-case: sealed/unsealed students eligible for an unseal request. */
export class ListSealedStudentsUseCase {
  constructor(private readonly repo: IAcademicRecordsSealRepository) {}

  execute(
    filter?: Partial<SealBatchKey>,
  ): Promise<SealResult<SealedStudentOption[]>> {
    return this.repo.listSealedStudents(filter);
  }
}
