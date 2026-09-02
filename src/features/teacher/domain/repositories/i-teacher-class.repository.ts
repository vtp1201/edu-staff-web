import type {
  TeacherClass,
  TeacherClassKpi,
} from "../entities/teacher-class.entity";
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
  /** GVCN-only KPI slice for one class (US-E24.7). Returns a PARTIAL KPI: an
   *  unavailable source (draft endpoint, failed call) leaves its field unset
   *  rather than failing the whole card. */
  getHomeroomKpi(
    classId: string,
  ): Promise<ClassResult<Partial<TeacherClassKpi>>>;
}
