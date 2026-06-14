/** A class taught by the teacher. `studentCount` is fetched separately via the
 *  per-class enrollment roster (the core ClassResponse carries no count field). */
export interface TeacherClass {
  id: string;
  name: string;
  gradeLevel: number;
  studentCount: number;
  /** True when the current teacher is this class's homeroom teacher (GVCN). */
  isHomeroom: boolean;
  /** e.g. "2025–2026" — for display in the class card / roster header. */
  academicYearLabel: string;
}
