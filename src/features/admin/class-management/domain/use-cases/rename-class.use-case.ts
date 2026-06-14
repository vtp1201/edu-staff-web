import type { Class, RenameClassInput } from "../entities/class.entity";
import type { ClassManagementFailure } from "../failures/class-management.failure";
import type { IClassManagementRepository } from "../repositories/i-class-management.repository";
import type { Result } from "./result";

export class RenameClassUseCase {
  constructor(private readonly repo: IClassManagementRepository) {}

  async execute(
    classId: string,
    input: RenameClassInput,
  ): Promise<Result<Class, ClassManagementFailure>> {
    return this.repo.renameClass(classId, input);
  }
}
