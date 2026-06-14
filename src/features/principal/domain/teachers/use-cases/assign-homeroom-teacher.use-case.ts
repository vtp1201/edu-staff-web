import {
  fail,
  type Result,
} from "@/features/admin/class-management/domain/use-cases/result";
import type { PrincipalTeachersFailure } from "../failures/principal-teachers.failure";
import type { IPrincipalTeachersRepository } from "../repositories/i-principal-teachers.repository";

export class AssignHomeroomTeacherUseCase {
  constructor(private readonly repo: IPrincipalTeachersRepository) {}

  async execute(
    classId: string,
    teacherId: string,
  ): Promise<Result<void, PrincipalTeachersFailure>> {
    if (!classId || !teacherId) return fail({ type: "unknown" });
    return this.repo.assignHomeroomTeacher(classId, teacherId);
  }
}
