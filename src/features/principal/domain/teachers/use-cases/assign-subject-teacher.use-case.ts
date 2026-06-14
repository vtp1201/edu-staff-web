import {
  fail,
  type Result,
} from "@/features/admin/class-management/domain/use-cases/result";
import type { PrincipalTeachersFailure } from "../failures/principal-teachers.failure";
import type { IPrincipalTeachersRepository } from "../repositories/i-principal-teachers.repository";

export class AssignSubjectTeacherUseCase {
  constructor(private readonly repo: IPrincipalTeachersRepository) {}

  async execute(
    classId: string,
    subjectId: string,
    teacherId: string,
  ): Promise<Result<void, PrincipalTeachersFailure>> {
    if (!classId || !subjectId || !teacherId) return fail({ type: "unknown" });
    return this.repo.assignSubjectTeacher(classId, subjectId, teacherId);
  }
}
