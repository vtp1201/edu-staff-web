import type { ClassSummary } from "../entities/class-summary.entity";
import type { RosterStudent } from "../entities/roster-student.entity";
import type { SearchStudent } from "../entities/search-student.entity";
import type { RosterFailure } from "../failures/roster.failure";

/** Discriminated result — success carries data; failure carries a typed key. */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: RosterFailure };

/** Void variant for write operations (no payload on success). */
export type VoidResult =
  | { ok: true; data?: undefined }
  | { ok: false; error: RosterFailure };

export interface IRosterRepository {
  getClasses(params: { yearId?: string }): Promise<Result<ClassSummary[]>>;
  getClassRoster(classId: string): Promise<Result<RosterStudent[]>>;
  getSearchPool(classId: string): Promise<Result<SearchStudent[]>>;
  enrollStudent(classId: string, studentId: string): Promise<VoidResult>;
  unenrollStudent(classId: string, studentId: string): Promise<VoidResult>;
  unenrollStudents(classId: string, studentIds: string[]): Promise<VoidResult>;
  transferStudent(
    studentId: string,
    fromClassId: string,
    toClassId: string,
  ): Promise<VoidResult>;
}
