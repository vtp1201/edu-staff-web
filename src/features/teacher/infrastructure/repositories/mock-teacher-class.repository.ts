import "server-only";
import type {
  TeacherClass,
  TeacherClassKpi,
} from "../../domain/entities/teacher-class.entity";
import type { TeacherRosterStudent } from "../../domain/entities/teacher-roster-student.entity";
import type {
  ClassResult,
  ITeacherClassRepository,
} from "../../domain/repositories/i-teacher-class.repository";

/** Seed data (not i18n) mirroring the teacher class-view handoff. */
const YEAR = "2025–2026";
const MATH = { id: "sub-math", name: "Toán" };

/** GVBM KPI comes from draft US-255 (`absentToday`/`pendingGrading` on
 *  `ClassResponse`) — not deployed, so every number here is illustrative and
 *  flagged in `demoFields` (ADR 0076) to drive the "demo" pill. */
function demoSubjectKpi(
  absentToday: number,
  pendingGrading: number,
): TeacherClassKpi {
  return {
    absentToday,
    pendingGrading,
    demoFields: ["absentToday", "pendingGrading"],
  };
}

const CLASSES: TeacherClass[] = [
  {
    id: "cls-10a1",
    name: "10A1",
    gradeLevel: 10,
    studentCount: 3,
    isHomeroom: true,
    roles: ["homeroom", "subject"],
    subjects: [MATH],
    kpi: demoSubjectKpi(2, 5),
    academicYearLabel: YEAR,
  },
  {
    id: "cls-11b2",
    name: "11B2",
    gradeLevel: 11,
    studentCount: 3,
    isHomeroom: false,
    roles: ["subject"],
    subjects: [MATH],
    kpi: demoSubjectKpi(0, 3),
    academicYearLabel: YEAR,
  },
  {
    id: "cls-12c1",
    name: "12C1",
    gradeLevel: 12,
    studentCount: 3,
    isHomeroom: false,
    roles: ["subject"],
    subjects: [MATH],
    kpi: demoSubjectKpi(1, 0),
    academicYearLabel: YEAR,
  },
  {
    // No KPI at all — exercises the "hide the tile row entirely" path.
    id: "cls-10a3",
    name: "10A3",
    gradeLevel: 10,
    studentCount: 3,
    isHomeroom: false,
    roles: ["subject"],
    subjects: [MATH],
    academicYearLabel: YEAR,
  },
];

const STUDENT_NAMES = ["Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường"];

function rosterFor(classId: string): TeacherRosterStudent[] {
  return STUDENT_NAMES.map((name, i) => ({
    enrollmentId: `${classId}-enr-${i + 1}`,
    studentMemberId: `${classId}-hs-${String(i + 1).padStart(2, "0")}`,
    displayName: name,
    academicYearLabel: YEAR,
    enrolledAt: "2025-09-01",
    status: i === 2 ? "transferred" : "active",
  }));
}

export class MockTeacherClassRepository implements ITeacherClassRepository {
  async listMyClasses(): Promise<ClassResult<TeacherClass[]>> {
    return { ok: true, data: CLASSES };
  }

  async getClassStudents(
    classId: string,
  ): Promise<ClassResult<TeacherRosterStudent[]>> {
    if (!CLASSES.some((c) => c.id === classId)) {
      return { ok: false, error: { type: "not-found" } };
    }
    return { ok: true, data: rosterFor(classId) };
  }

  /** `attendanceRate` is draft US-245 AND unwireable today (no term source on
   *  the web) → flagged demo. `openViolations`/`pendingLeave` mirror REAL
   *  conduct endpoints, so they are ordinary mock data, not draft data. */
  async getHomeroomKpi(
    classId: string,
  ): Promise<ClassResult<Partial<TeacherClassKpi>>> {
    const cls = CLASSES.find((c) => c.id === classId);
    if (!cls) return { ok: false, error: { type: "not-found" } };
    if (!cls.roles.includes("homeroom"))
      return { ok: true, data: { demoFields: [] } };
    return {
      ok: true,
      data: {
        attendanceRate: 0.94,
        openViolations: 2,
        pendingLeave: 1,
        demoFields: ["attendanceRate"],
      },
    };
  }
}
