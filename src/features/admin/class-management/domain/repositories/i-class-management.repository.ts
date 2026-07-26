import type {
  Class,
  CreateClassInput,
  RenameClassInput,
} from "../entities/class.entity";
import type { TeacherMember } from "../entities/teacher-member.entity";
import type { ClassManagementFailure } from "../failures/class-management.failure";
import type { Result } from "../use-cases/result";

export interface ClassListPage {
  data: Class[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface IClassManagementRepository {
  listClasses(params: {
    academicYear?: string;
    gradeLevel?: number;
    cursor?: string;
    /**
     * Page size (real wire bound: 1–100). Optional and only forwarded when
     * supplied, so existing callers (`(app)/admin/classes`'s `listClasses({})`)
     * keep relying on the BE default. Added for US-E13.8, whose principal
     * class list always passes an explicit `limit: 100` so its client-side
     * status/grade/name filter + sort behaves as effectively-global.
     */
    limit?: number;
  }): Promise<Result<ClassListPage, ClassManagementFailure>>;

  createClass(
    input: CreateClassInput,
  ): Promise<Result<Class, ClassManagementFailure>>;

  renameClass(
    classId: string,
    input: RenameClassInput,
  ): Promise<Result<Class, ClassManagementFailure>>;

  archiveClass(classId: string): Promise<Result<void, ClassManagementFailure>>;

  assignHomeroomTeacher(
    classId: string,
    teacherUserId: string,
  ): Promise<Result<void, ClassManagementFailure>>;

  getHomeroomTeacher(
    classId: string,
  ): Promise<Result<TeacherMember | null, ClassManagementFailure>>;

  listTeachers(params: {
    search?: string;
  }): Promise<Result<TeacherMember[], ClassManagementFailure>>;
}
