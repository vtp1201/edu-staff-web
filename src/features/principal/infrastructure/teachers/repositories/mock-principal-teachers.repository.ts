import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import {
  ok,
  type Result,
} from "@/features/admin/class-management/domain/use-cases/result";
import type { PrincipalClassSubject } from "../../../domain/teachers/entities/class-subject.entity";
import type { PrincipalTeacher } from "../../../domain/teachers/entities/principal-teacher.entity";
import type { PrincipalTeachersFailure } from "../../../domain/teachers/failures/principal-teachers.failure";
import type { IPrincipalTeachersRepository } from "../../../domain/teachers/repositories/i-principal-teachers.repository";

// Module-level mutable seed so assignments persist across calls within a single
// dev server process (mock-first pattern, decision 0014).
let teachers: PrincipalTeacher[] = [
  {
    teacherId: "t-001",
    displayName: "Nguyễn Thị Lan",
    email: "lan@edu.vn",
    primarySubjectName: "Toán",
    homeroomClassId: "c-10a1",
    homeroomClassName: "10A1",
    subjectAssignments: [],
    status: "ACTIVE",
  },
  {
    teacherId: "t-002",
    displayName: "Trần Văn Minh",
    email: "minh@edu.vn",
    primarySubjectName: "Văn",
    homeroomClassId: null,
    homeroomClassName: null,
    subjectAssignments: [
      {
        classSubjectId: "cs-001",
        classId: "c-11b1",
        className: "11B1",
        subjectId: "s-van",
        subjectName: "Ngữ văn",
        hasConflict: false,
      },
    ],
    status: "ACTIVE",
  },
  {
    teacherId: "t-003",
    displayName: "Lê Thị Hoa",
    email: "hoa@edu.vn",
    primarySubjectName: "Lý",
    homeroomClassId: "c-12c2",
    homeroomClassName: "12C2",
    subjectAssignments: [
      {
        classSubjectId: "cs-002",
        classId: "c-12c2",
        className: "12C2",
        subjectId: "s-ly",
        subjectName: "Vật lý",
        hasConflict: true,
      },
    ],
    status: "ON_LEAVE",
  },
];

const classes: Class[] = [
  {
    id: "c-10a1",
    name: "10A1",
    gradeLevel: 10,
    status: "ACTIVE",
    academicYear: "2025-2026",
    studentCount: 32,
    homeroomTeacherId: "t-001",
    homeroomTeacherName: "Nguyễn Thị Lan",
  },
  {
    id: "c-10a2",
    name: "10A2",
    gradeLevel: 10,
    status: "ACTIVE",
    academicYear: "2025-2026",
    studentCount: 28,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
  },
  {
    id: "c-11b1",
    name: "11B1",
    gradeLevel: 11,
    status: "ACTIVE",
    academicYear: "2025-2026",
    studentCount: 30,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
  },
  {
    id: "c-12c2",
    name: "12C2",
    gradeLevel: 12,
    status: "ACTIVE",
    academicYear: "2025-2026",
    studentCount: 29,
    homeroomTeacherId: "t-003",
    homeroomTeacherName: "Lê Thị Hoa",
  },
];

let subjects: PrincipalClassSubject[] = [
  {
    id: "cs-001",
    classId: "c-11b1",
    subjectId: "s-van",
    subjectName: "Ngữ văn",
    teacherId: "t-002",
    teacherName: "Trần Văn Minh",
  },
  {
    id: "cs-002",
    classId: "c-12c2",
    subjectId: "s-ly",
    subjectName: "Vật lý",
    teacherId: "t-003",
    teacherName: "Lê Thị Hoa",
  },
  {
    id: "cs-003",
    classId: "c-10a1",
    subjectId: "s-toan",
    subjectName: "Toán",
    teacherId: null,
    teacherName: null,
  },
];

function teacherName(teacherId: string): string | null {
  return teachers.find((t) => t.teacherId === teacherId)?.displayName ?? null;
}

function className(classId: string): string | null {
  return classes.find((c) => c.id === classId)?.name ?? null;
}

export class MockPrincipalTeachersRepository
  implements IPrincipalTeachersRepository
{
  async listTeachers(): Promise<
    Result<PrincipalTeacher[], PrincipalTeachersFailure>
  > {
    await mockDelay();
    return ok(teachers);
  }

  async listClasses(): Promise<Result<Class[], PrincipalTeachersFailure>> {
    await mockDelay();
    return ok(classes);
  }

  async getClassSubjects(
    classId: string,
  ): Promise<Result<PrincipalClassSubject[], PrincipalTeachersFailure>> {
    await mockDelay();
    return ok(subjects.filter((s) => s.classId === classId));
  }

  async assignHomeroomTeacher(
    classId: string,
    teacherId: string,
  ): Promise<Result<void, PrincipalTeachersFailure>> {
    await mockDelay();
    const name = className(classId);
    teachers = teachers.map((t) => {
      // clear any other teacher who held this homeroom
      if (t.homeroomClassId === classId && t.teacherId !== teacherId) {
        return { ...t, homeroomClassId: null, homeroomClassName: null };
      }
      if (t.teacherId === teacherId) {
        return { ...t, homeroomClassId: classId, homeroomClassName: name };
      }
      return t;
    });
    return ok(undefined);
  }

  async assignSubjectTeacher(
    classId: string,
    subjectId: string,
    teacherId: string,
  ): Promise<Result<void, PrincipalTeachersFailure>> {
    await mockDelay();
    const name = teacherName(teacherId);
    subjects = subjects.map((s) =>
      s.classId === classId && s.subjectId === subjectId
        ? { ...s, teacherId, teacherName: name }
        : s,
    );
    return ok(undefined);
  }
}
