import type { TeacherClass } from "../entities/teacher-class.entity";
import type { TeacherRosterStudent } from "../entities/teacher-roster-student.entity";
import type { TeacherClassFailure } from "../failures/teacher-class.failure";

/** Discriminated result — success carries data; failure carries a typed key. */
export type ClassResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: TeacherClassFailure };

export interface ITeacherClassRepository {
  listMyClasses(): Promise<ClassResult<TeacherClass[]>>;
  getClassStudents(
    classId: string,
  ): Promise<ClassResult<TeacherRosterStudent[]>>;
}
