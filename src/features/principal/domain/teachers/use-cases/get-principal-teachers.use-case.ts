import type { Result } from "@/features/admin/class-management/domain/use-cases/result";
import type { PrincipalTeacher } from "../entities/principal-teacher.entity";
import type { PrincipalTeachersFailure } from "../failures/principal-teachers.failure";
import type { IPrincipalTeachersRepository } from "../repositories/i-principal-teachers.repository";

export class GetPrincipalTeachersUseCase {
  constructor(private readonly repo: IPrincipalTeachersRepository) {}

  async execute(): Promise<
    Result<PrincipalTeacher[], PrincipalTeachersFailure>
  > {
    return this.repo.listTeachers();
  }
}
