import type {
  GradeBook,
  GradeBookRole,
} from "@/features/grades/domain/entities/grade-book.entity";

export interface GradeBookTableVM {
  gradeBook: GradeBook;
  role: GradeBookRole;
  /** whether grades are visible to the viewer (gate for student/parent) */
  isPublished: boolean;
  /** teacher only — navigate to grade entry for the current class-subject */
  onEnterGrades?: (csId: string) => void;
}
