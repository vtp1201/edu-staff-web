import { describe, expect, it, vi } from "vitest";
import type { TeacherRosterStudent } from "../entities/teacher-roster-student.entity";
import type {
  ClassResult,
  ITeacherClassRepository,
} from "../repositories/i-teacher-class.repository";
import { GetClassStudentsUseCase } from "./get-class-students.use-case";

const STUDENTS: TeacherRosterStudent[] = [
  {
    enrollmentId: "enr-1",
    studentMemberId: "stu-1",
    displayName: "Nguyễn Văn An",
    academicYearLabel: "2025–2026",
    enrolledAt: "2025-09-01",
    status: "active",
  },
];

function makeRepo(
  over: Partial<ITeacherClassRepository> = {},
): ITeacherClassRepository {
  return {
    listMyClasses: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    getClassStudents: vi
      .fn()
      .mockResolvedValue({ ok: true, data: STUDENTS } satisfies ClassResult<
        TeacherRosterStudent[]
      >),
    ...over,
  };
}

describe("GetClassStudentsUseCase", () => {
  it("returns the class roster on success and forwards the classId", async () => {
    const repo = makeRepo();
    const res = await new GetClassStudentsUseCase(repo).execute("cls-1");
    expect(repo.getClassStudents).toHaveBeenCalledWith("cls-1");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(STUDENTS);
  });

  it("rejects an empty classId with not-found without calling the repo", async () => {
    const repo = makeRepo();
    const res = await new GetClassStudentsUseCase(repo).execute("");
    expect(repo.getClassStudents).not.toHaveBeenCalled();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("not-found");
  });

  it("propagates a not-found failure from the repo", async () => {
    const repo = makeRepo({
      getClassStudents: vi
        .fn()
        .mockResolvedValue({ ok: false, error: { type: "not-found" } }),
    });
    const res = await new GetClassStudentsUseCase(repo).execute("cls-x");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("not-found");
  });
});
