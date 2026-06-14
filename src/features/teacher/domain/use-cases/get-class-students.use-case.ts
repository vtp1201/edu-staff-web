import type { TeacherRosterStudent } from "../entities/teacher-roster-student.entity";
import type {
  ClassResult,
  ITeacherClassRepository,
} from "../repositories/i-teacher-class.repository";

/** Fetches the read-only student roster for one of the teacher's classes. */
export class GetClassStudentsUseCase {
  constructor(private readonly repo: ITeacherClassRepository) {}

  execute(classId: string): Promise<ClassResult<TeacherRosterStudent[]>> {
    if (classId.trim().length === 0) {
      return Promise.resolve({ ok: false, error: { type: "not-found" } });
    }
    return this.repo.getClassStudents(classId);
  }
}
