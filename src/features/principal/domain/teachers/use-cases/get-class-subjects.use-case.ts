import type { Result } from "@/features/admin/class-management/domain/use-cases/result";
import type { PrincipalClassSubject } from "../entities/class-subject.entity";
import type { PrincipalTeachersFailure } from "../failures/principal-teachers.failure";
import type { IPrincipalTeachersRepository } from "../repositories/i-principal-teachers.repository";

export class GetClassSubjectsUseCase {
  constructor(
    private readonly repo: IPrincipalTeachersRepository,
    private readonly classId: string,
  ) {}

  async execute(): Promise<
    Result<PrincipalClassSubject[], PrincipalTeachersFailure>
  > {
    return this.repo.getClassSubjects(this.classId);
  }
}
