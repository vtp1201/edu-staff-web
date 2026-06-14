import type { TeacherClassFailure } from "../../domain/failures/teacher-class.failure";

export interface TeacherRosterStudentVM {
  enrollmentId: string;
  displayName: string;
  /** studentMemberId, shown to the teacher as the student code. */
  studentCode: string;
  status: "active" | "transferred";
}

export interface TeacherClassStudentsScreenVM {
  /** "ready" → render the table (possibly empty). "error" → typed error. */
  status: "ready" | "error";
  /** Present when status === "error"; maps to `teacherClasses.errors.<type>`. */
  errorKey?: TeacherClassFailure["type"];
  className: string;
  /** App-relative route back to the class list (breadcrumb link). */
  classesHref: string;
  students: TeacherRosterStudentVM[];
}
