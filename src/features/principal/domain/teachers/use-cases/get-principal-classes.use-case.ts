import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import type { Result } from "@/features/admin/class-management/domain/use-cases/result";
import type { PrincipalTeachersFailure } from "../failures/principal-teachers.failure";
import type { IPrincipalTeachersRepository } from "../repositories/i-principal-teachers.repository";

export class GetPrincipalClassesUseCase {
  constructor(private readonly repo: IPrincipalTeachersRepository) {}

  async execute(): Promise<Result<Class[], PrincipalTeachersFailure>> {
    return this.repo.listClasses();
  }
}
