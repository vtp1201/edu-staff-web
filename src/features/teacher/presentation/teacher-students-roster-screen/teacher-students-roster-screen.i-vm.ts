import type { TeacherClassFailure } from "../../domain/failures/teacher-class.failure";

export interface TeacherStudentRosterRowVM {
  studentMemberId: string;
  displayName: string;
  /** Class the student was first found in (de-dupe keeps the first match). */
  className: string;
  status: "active" | "transferred";
  /** App-relative route to this student's academic record. */
  academicRecordHref: string;
}

export interface TeacherStudentsRosterScreenVM {
  /** "ready" → render the list (possibly empty). "error" → typed error. */
  status: "ready" | "error";
  /** Present when status === "error"; maps to `teacherStudentsRoster.errors.<type>`. */
  errorKey?: TeacherClassFailure["type"];
  rows: TeacherStudentRosterRowVM[];
  /** Distinct class names present in `rows`, for the class filter. */
  classNames: string[];
  /**
   * Classes whose roster failed to load while others succeeded. > 0 renders a
   * non-blocking notice — a partial fetch failure is never silent.
   */
  failedClassCount: number;
}
