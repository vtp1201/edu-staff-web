import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import type { PrincipalTeacher } from "@/features/principal/domain/teachers/entities/principal-teacher.entity";
import type { PrincipalTeachersFailure } from "@/features/principal/domain/teachers/failures/principal-teachers.failure";

export type AssignResult = {
  errorKey: PrincipalTeachersFailure["type"] | null;
};

export interface PrincipalTeachersVM {
  teachers: PrincipalTeacher[];
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
}

export interface TeacherAssignmentSheetVM {
  teacher: PrincipalTeacher;
  /** Class options for the pickers. Falls back to the bundled class list when omitted. */
  classes?: Class[];
  onAssignHomeroom: (
    classId: string,
    teacherId: string,
  ) => Promise<AssignResult>;
  onAssignSubjectTeacher: (
    classId: string,
    subjectId: string,
    teacherId: string,
  ) => Promise<AssignResult>;
  onClose: () => void;
}
