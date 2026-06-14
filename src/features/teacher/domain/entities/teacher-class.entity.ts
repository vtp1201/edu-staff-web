/** A class taught by the teacher. `studentCount` is fetched separately via the
 *  per-class enrollment roster (the core ClassResponse carries no count field). */
export interface TeacherClass {
  id: string;
  name: string;
  gradeLevel: number;
  studentCount: number;
}
