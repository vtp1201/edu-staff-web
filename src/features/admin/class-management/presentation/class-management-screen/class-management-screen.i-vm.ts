import type {
  Class,
  CreateClassInput,
  RenameClassInput,
} from "@/features/admin/class-management/domain/entities/class.entity";
import type { TeacherMember } from "@/features/admin/class-management/domain/entities/teacher-member.entity";
import type { ClassManagementFailure } from "@/features/admin/class-management/domain/failures/class-management.failure";

export interface ClassManagementScreenVm {
  classes: Class[];
  nextCursor: string | null;
  hasMore: boolean;
  /** Grade range from school setup. Null if not configured yet. */
  gradeRange: { minGrade: number; maxGrade: number } | null;
  /** Pre-loaded teachers for the homeroom picker (mock-first; may be empty). */
  teachers: TeacherMember[];
}

export interface ClassActionResult {
  ok: boolean;
  errorKey?: ClassManagementFailure["type"];
  data?: Class;
}

export interface TeacherListActionResult {
  ok: boolean;
  data?: TeacherMember[];
  errorKey?: ClassManagementFailure["type"];
}

export interface ClassManagementScreenProps {
  vm: ClassManagementScreenVm;
  onCreateClass: (input: CreateClassInput) => Promise<ClassActionResult>;
  onRenameClass: (
    classId: string,
    input: RenameClassInput,
  ) => Promise<ClassActionResult>;
  onArchiveClass: (classId: string) => Promise<ClassActionResult>;
  onAssignHomeroom: (
    classId: string,
    teacherUserId: string,
  ) => Promise<ClassActionResult>;
  onListTeachers: (search?: string) => Promise<TeacherListActionResult>;
}
