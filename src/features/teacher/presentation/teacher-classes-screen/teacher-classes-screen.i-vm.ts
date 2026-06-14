import type { TeacherClassFailure } from "../../domain/failures/teacher-class.failure";

/** ViewModel for one class card. `studentsHref` is app-relative (rendered as a Link). */
export interface TeacherClassVM {
  id: string;
  name: string;
  gradeLevel: number;
  studentCount: number;
  isHomeroom: boolean;
  /** App-relative route to this class's read-only student roster. */
  studentsHref: string;
}

export interface TeacherClassesScreenVM {
  /** "ready" → render `classes` (possibly empty → empty state).
   *  "error" → render the typed `errorKey` message + retry button. */
  status: "ready" | "error";
  /** Present when status === "error"; maps to `teacherClasses.errors.<type>`. */
  errorKey?: TeacherClassFailure["type"];
  classes: TeacherClassVM[];
}
