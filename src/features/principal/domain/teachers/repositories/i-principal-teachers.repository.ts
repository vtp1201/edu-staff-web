import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import type { Result } from "@/features/admin/class-management/domain/use-cases/result";
import type { PrincipalClassSubject } from "../entities/class-subject.entity";
import type { PrincipalTeacher } from "../entities/principal-teacher.entity";
import type { PrincipalTeachersFailure } from "../failures/principal-teachers.failure";

export interface IPrincipalTeachersRepository {
  listTeachers(): Promise<Result<PrincipalTeacher[], PrincipalTeachersFailure>>;
  listClasses(): Promise<Result<Class[], PrincipalTeachersFailure>>;
  getClassSubjects(
    classId: string,
  ): Promise<Result<PrincipalClassSubject[], PrincipalTeachersFailure>>;
  assignHomeroomTeacher(
    classId: string,
    teacherId: string,
  ): Promise<Result<void, PrincipalTeachersFailure>>;
  assignSubjectTeacher(
    classId: string,
    subjectId: string,
    teacherId: string,
  ): Promise<Result<void, PrincipalTeachersFailure>>;
}
