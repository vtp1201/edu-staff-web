import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type { ChildSummary, GradeBook } from "../entities/grade-book.entity";

/**
 * Throwing repository (matches the IGradesRepository convention): success
 * returns the value, failures throw a {@link GradesFailure} object. The
 * use-case layer catches and maps to the failure union.
 *
 * US-E18.12 (ADR 0054) — remapped identity (`ClassSubjectTermKey`).
 * `getMyGrades`/`getChildGrades` are keyed by `(studentMemberId,
 * academicYearLabel)` ONLY (not class/subject/term) because `GET
 * /members/{memberId}/grades?year=` returns the student's entire year across
 * every subject in one call — they naturally return an array of per-subject
 * `GradeBook`s, a genuine shape divergence from the teacher/admin
 * `getGradeBook` (kept as two distinct methods rather than one forced
 * generic signature). Term (`HK1`) narrowing, if wanted, is a client-side
 * filter over the returned array.
 */
export interface IGradeBookRepository {
  /** teacher / principal / admin — full class roster for one class-subject-term */
  getGradeBook(key: ClassSubjectTermKey): Promise<GradeBook>;
  /** student self — every subject for the whole academic year */
  getMyGrades(
    studentMemberId: string,
    academicYearLabel: string,
  ): Promise<GradeBook[]>;
  /** parent — every subject for the whole academic year, for one linked child */
  getChildGrades(
    childId: string,
    academicYearLabel: string,
  ): Promise<GradeBook[]>;
  /** parent — list of children linked to the signed-in viewer (permanently mock, ADR 0054) */
  getChildList(): Promise<ChildSummary[]>;
}
