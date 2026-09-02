import { describe, expect, it, vi } from "vitest";
import type { TeacherClass } from "../entities/teacher-class.entity";
import type { TeacherRosterStudent } from "../entities/teacher-roster-student.entity";
import type {
  ClassResult,
  ITeacherClassRepository,
} from "../repositories/i-teacher-class.repository";
import { GetClassStudentsUseCase } from "./get-class-students.use-case";
import { ListMyClassesUseCase } from "./list-my-classes.use-case";
import { ListMyStudentsUseCase } from "./list-my-students.use-case";

const YEAR = "2025–2026";

function cls(id: string, name: string, gradeLevel = 10): TeacherClass {
  return {
    id,
    name,
    gradeLevel,
    studentCount: 0,
    isHomeroom: false,
    roles: [],
    subjects: [],
    academicYearLabel: YEAR,
  };
}

function student(
  id: string,
  displayName: string,
  status: TeacherRosterStudent["status"] = "active",
): TeacherRosterStudent {
  return {
    enrollmentId: `enr-${id}`,
    studentMemberId: id,
    displayName,
    academicYearLabel: YEAR,
    enrolledAt: "2025-09-01",
    status,
  };
}

/**
 * Builds the use-case under test over a stub repository, since it composes the
 * two real use-cases (which are thin wrappers over the repo interface).
 */
function makeUseCase(repo: ITeacherClassRepository) {
  return new ListMyStudentsUseCase(
    new ListMyClassesUseCase(repo),
    new GetClassStudentsUseCase(repo),
  );
}

function makeRepo(
  over: Partial<ITeacherClassRepository> = {},
): ITeacherClassRepository {
  return {
    listMyClasses: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    getClassStudents: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    getHomeroomKpi: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    ...over,
  };
}

/** Per-class roster stub keyed by classId; missing key → typed failure. */
function rosterBy(
  map: Record<string, ClassResult<TeacherRosterStudent[]>>,
): ITeacherClassRepository["getClassStudents"] {
  return vi
    .fn()
    .mockImplementation((classId: string) =>
      Promise.resolve(
        map[classId] ?? { ok: false, error: { type: "not-found" as const } },
      ),
    );
}

describe("ListMyStudentsUseCase", () => {
  it("returns an empty roster without firing any per-class call when the teacher has no classes", async () => {
    const repo = makeRepo();
    const res = await makeUseCase(repo).execute();

    expect(repo.getClassStudents).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.rows).toEqual([]);
      expect(res.data.failedClassCount).toBe(0);
    }
  });

  it("propagates a class-list failure verbatim (whole-screen error)", async () => {
    const repo = makeRepo({
      listMyClasses: vi
        .fn()
        .mockResolvedValue({ ok: false, error: { type: "unauthorized" } }),
    });
    const res = await makeUseCase(repo).execute();

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("unauthorized");
  });

  it("flattens every class roster, tagging each row with its class, in class then row order", async () => {
    const repo = makeRepo({
      listMyClasses: vi.fn().mockResolvedValue({
        ok: true,
        data: [cls("c1", "10A1"), cls("c2", "11B2", 11)],
      }),
      getClassStudents: rosterBy({
        c1: { ok: true, data: [student("s1", "An"), student("s2", "Bình")] },
        c2: { ok: true, data: [student("s3", "Cường", "transferred")] },
      }),
    });

    const res = await makeUseCase(repo).execute();

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.failedClassCount).toBe(0);
    expect(res.data.rows).toEqual([
      {
        studentMemberId: "s1",
        displayName: "An",
        classId: "c1",
        className: "10A1",
        status: "active",
      },
      {
        studentMemberId: "s2",
        displayName: "Bình",
        classId: "c1",
        className: "10A1",
        status: "active",
      },
      {
        studentMemberId: "s3",
        displayName: "Cường",
        classId: "c2",
        className: "11B2",
        status: "transferred",
      },
    ]);
  });

  it("de-dupes a student in two classes, keeping the first class encountered", async () => {
    const repo = makeRepo({
      listMyClasses: vi.fn().mockResolvedValue({
        ok: true,
        data: [cls("c1", "10A1"), cls("c2", "11B2", 11)],
      }),
      getClassStudents: rosterBy({
        c1: { ok: true, data: [student("shared", "An")] },
        c2: {
          ok: true,
          data: [student("shared", "An", "transferred"), student("s9", "Dũng")],
        },
      }),
    });

    const res = await makeUseCase(repo).execute();

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.rows).toHaveLength(2);
    expect(res.data.rows[0]).toMatchObject({
      studentMemberId: "shared",
      classId: "c1",
      className: "10A1",
      status: "active",
    });
    expect(res.data.rows[1]?.studentMemberId).toBe("s9");
  });

  it("degrades per class: keeps the classes that resolved and counts the ones that failed", async () => {
    const repo = makeRepo({
      listMyClasses: vi.fn().mockResolvedValue({
        ok: true,
        data: [cls("bad", "10A1"), cls("good", "11B2", 11)],
      }),
      getClassStudents: rosterBy({
        bad: { ok: false, error: { type: "network-error" } },
        good: { ok: true, data: [student("s3", "Cường")] },
      }),
    });

    const res = await makeUseCase(repo).execute();

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.rows.map((r) => r.studentMemberId)).toEqual(["s3"]);
    expect(res.data.failedClassCount).toBe(1);
  });

  it("reports every class as failed (ready-but-empty, not an error) when all rosters fail", async () => {
    const repo = makeRepo({
      listMyClasses: vi.fn().mockResolvedValue({
        ok: true,
        data: [cls("c1", "10A1"), cls("c2", "11B2", 11)],
      }),
      getClassStudents: vi
        .fn()
        .mockResolvedValue({ ok: false, error: { type: "network-error" } }),
    });

    const res = await makeUseCase(repo).execute();

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.rows).toEqual([]);
    expect(res.data.failedClassCount).toBe(2);
  });
});
