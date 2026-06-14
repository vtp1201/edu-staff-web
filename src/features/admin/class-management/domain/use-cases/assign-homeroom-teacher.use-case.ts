import type { ClassManagementFailure } from "../failures/class-management.failure";
import type { IClassManagementRepository } from "../repositories/i-class-management.repository";
import type { Result } from "./result";

export class AssignHomeroomTeacherUseCase {
  constructor(private readonly repo: IClassManagementRepository) {}

  async execute(
    classId: string,
    teacherUserId: string,
  ): Promise<Result<void, ClassManagementFailure>> {
    return this.repo.assignHomeroomTeacher(classId, teacherUserId);
  }
}
