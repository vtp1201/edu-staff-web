import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import type { PrincipalClassSubject } from "@/features/principal/domain/teachers/entities/class-subject.entity";
import type { PrincipalTeacher } from "@/features/principal/domain/teachers/entities/principal-teacher.entity";
import type { PrincipalTeachersFailure } from "@/features/principal/domain/teachers/failures/principal-teachers.failure";

export type AssignResult = {
  errorKey: PrincipalTeachersFailure["type"] | null;
};

export interface PrincipalTeachersVM {
  teachers: PrincipalTeacher[];
  /** Class options for the assignment-sheet pickers (RSC-fed). */
  classes: Class[];
  fetchError: PrincipalTeachersFailure["type"] | null;
  /** Optional override for skeleton state (Storybook); production renders SSR data. */
  loading?: boolean;
  onAssignHomeroom: (
    classId: string,
    teacherId: string,
  ) => Promise<AssignResult>;
  onAssignSubjectTeacher: (
    classId: string,
    subjectId: string,
    teacherId: string,
  ) => Promise<AssignResult>;
  /** Fetch the class-subjects of a class (server action) to drive the GVBM subject picker. */
  onGetClassSubjects: (classId: string) => Promise<PrincipalClassSubject[]>;
}

export interface TeacherAssignmentSheetVM {
  teacher: PrincipalTeacher;
  /** Class options for the pickers (RSC-fed). */
  classes: Class[];
  onAssignHomeroom: (
    classId: string,
    teacherId: string,
  ) => Promise<AssignResult>;
  onAssignSubjectTeacher: (
    classId: string,
    subjectId: string,
    teacherId: string,
  ) => Promise<AssignResult>;
  /** Fetch the class-subjects of a class to drive the GVBM subject picker. */
  onGetClassSubjects: (classId: string) => Promise<PrincipalClassSubject[]>;
  onClose: () => void;
}
