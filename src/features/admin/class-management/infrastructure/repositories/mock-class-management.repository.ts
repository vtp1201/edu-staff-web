import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  Class,
  CreateClassInput,
  RenameClassInput,
} from "../../domain/entities/class.entity";
import type { TeacherMember } from "../../domain/entities/teacher-member.entity";
import type { ClassManagementFailure } from "../../domain/failures/class-management.failure";
import type {
  ClassListPage,
  IClassManagementRepository,
} from "../../domain/repositories/i-class-management.repository";
import { ok, type Result } from "../../domain/use-cases/result";

// Module-level mutable seed so create/rename/archive/assign persist across calls
// within a single dev server process (mock-first pattern, decision 0014).
let classes: Class[] = [
  {
    id: "c-10a1",
    name: "10A1",
    gradeLevel: 10,
    status: "ACTIVE",
    academicYear: "2025-2026",
    studentCount: 32,
    homeroomTeacherId: "u-teacher-1",
    homeroomTeacherName: "Nguyễn Thị Lan",
  },
  {
    id: "c-10a2",
    name: "10A2",
    gradeLevel: 10,
    status: "ACTIVE",
    academicYear: "2025-2026",
    studentCount: 0,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
  },
  {
    id: "c-11b1",
    name: "11B1",
    gradeLevel: 11,
    status: "ACTIVE",
    academicYear: "2025-2026",
    studentCount: 28,
    homeroomTeacherId: "u-teacher-2",
    homeroomTeacherName: "Trần Văn Minh",
  },
  {
    id: "c-12c1",
    name: "12C1",
    gradeLevel: 12,
    status: "ARCHIVED",
    academicYear: "2024-2025",
    studentCount: 0,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
  },
  {
    id: "c-12c2",
    name: "12C2",
    gradeLevel: 12,
    status: "ACTIVE",
    academicYear: "2025-2026",
    studentCount: 30,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
  },
];

const teachers: TeacherMember[] = [
  {
    userId: "u-teacher-1",
    displayName: "Nguyễn Thị Lan",
    email: "lan.nguyen@edu.example",
  },
  {
    userId: "u-teacher-2",
    displayName: "Trần Văn Minh",
    email: "minh.tran@edu.example",
  },
  {
    userId: "u-teacher-3",
    displayName: "Lê Hoàng Phúc",
    email: "phuc.le@edu.example",
  },
  {
    userId: "u-teacher-4",
    displayName: "Phạm Thu Hà",
    email: "ha.pham@edu.example",
  },
];

export class MockClassManagementRepository
  implements IClassManagementRepository
{
  async listClasses(params: {
    academicYear?: string;
    gradeLevel?: number;
    cursor?: string;
  }): Promise<Result<ClassListPage, ClassManagementFailure>> {
    await mockDelay();
    const filtered = classes.filter((c) => {
      if (params.academicYear && c.academicYear !== params.academicYear) {
        return false;
      }
      if (
        params.gradeLevel !== undefined &&
        c.gradeLevel !== params.gradeLevel
      ) {
        return false;
      }
      return true;
    });
    return ok({ data: filtered, nextCursor: null, hasMore: false });
  }

  async createClass(
    input: CreateClassInput,
  ): Promise<Result<Class, ClassManagementFailure>> {
    await mockDelay();
    const created: Class = {
      id: `c-${Date.now()}`,
      name: input.name,
      gradeLevel: input.gradeLevel,
      status: "ACTIVE",
      academicYear: input.academicYear,
      studentCount: 0,
      homeroomTeacherId: null,
      homeroomTeacherName: null,
    };
    classes = [created, ...classes];
    return ok(created);
  }

  async renameClass(
    classId: string,
    input: RenameClassInput,
  ): Promise<Result<Class, ClassManagementFailure>> {
    await mockDelay();
    let updated: Class | undefined;
    classes = classes.map((c) => {
      if (c.id !== classId) return c;
      updated = {
        ...c,
        name: input.name ?? c.name,
        gradeLevel: input.gradeLevel ?? c.gradeLevel,
      };
      return updated;
    });
    if (!updated) return { ok: false, failure: { type: "not-found" } };
    return ok(updated);
  }

  async archiveClass(
    classId: string,
  ): Promise<Result<void, ClassManagementFailure>> {
    await mockDelay();
    let found = false;
    classes = classes.map((c) => {
      if (c.id !== classId) return c;
      found = true;
      return { ...c, status: "ARCHIVED" };
    });
    if (!found) return { ok: false, failure: { type: "not-found" } };
    return ok(undefined);
  }

  async assignHomeroomTeacher(
    classId: string,
    teacherUserId: string,
  ): Promise<Result<void, ClassManagementFailure>> {
    await mockDelay();
    const teacher = teachers.find((t) => t.userId === teacherUserId);
    let found = false;
    classes = classes.map((c) => {
      if (c.id !== classId) return c;
      found = true;
      return {
        ...c,
        homeroomTeacherId: teacherUserId,
        homeroomTeacherName: teacher?.displayName ?? null,
      };
    });
    if (!found) return { ok: false, failure: { type: "not-found" } };
    return ok(undefined);
  }

  async getHomeroomTeacher(
    classId: string,
  ): Promise<Result<TeacherMember | null, ClassManagementFailure>> {
    await mockDelay();
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return { ok: false, failure: { type: "not-found" } };
    if (!cls.homeroomTeacherId) return ok(null);
    return ok(teachers.find((t) => t.userId === cls.homeroomTeacherId) ?? null);
  }

  async listTeachers(params: {
    search?: string;
  }): Promise<Result<TeacherMember[], ClassManagementFailure>> {
    await mockDelay();
    const q = params.search?.trim().toLowerCase();
    const result = q
      ? teachers.filter((t) => t.displayName.toLowerCase().includes(q))
      : teachers;
    return ok(result);
  }
}
