import type { ClassManagementFailure } from "../failures/class-management.failure";
import type { IClassManagementRepository } from "../repositories/i-class-management.repository";
import type { Result } from "./result";

/**
 * Pass-through use-case. The "class has students" warning (AC-4) is a UI-only
 * concern resolved client-side from the pre-loaded studentCount in the VM; the
 * server archive call only runs after the admin confirms.
 */
export class ArchiveClassUseCase {
  constructor(private readonly repo: IClassManagementRepository) {}

  async execute(
    classId: string,
  ): Promise<Result<void, ClassManagementFailure>> {
    return this.repo.archiveClass(classId);
  }
}
