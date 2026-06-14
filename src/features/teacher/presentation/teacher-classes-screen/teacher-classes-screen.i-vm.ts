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
   *  "error" → render the error message + retry hint (RSC: no client refetch). */
  status: "ready" | "error";
  classes: TeacherClassVM[];
}
