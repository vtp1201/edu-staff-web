import { describe, expect, it, vi } from "vitest";
import type { TeacherClass } from "../entities/teacher-class.entity";
import type {
  ClassResult,
  ITeacherClassRepository,
} from "../repositories/i-teacher-class.repository";
import { ListMyClassesUseCase } from "./list-my-classes.use-case";

const CLASSES: TeacherClass[] = [
  {
    id: "cls-1",
    name: "10A1",
    gradeLevel: 10,
    studentCount: 32,
    isHomeroom: true,
    academicYearLabel: "2025–2026",
  },
  {
    id: "cls-2",
    name: "11B2",
    gradeLevel: 11,
    studentCount: 28,
    isHomeroom: false,
    academicYearLabel: "2025–2026",
  },
];

function makeRepo(
  over: Partial<ITeacherClassRepository> = {},
): ITeacherClassRepository {
  return {
    listMyClasses: vi
      .fn()
      .mockResolvedValue({ ok: true, data: CLASSES } satisfies ClassResult<
        TeacherClass[]
      >),
    getClassStudents: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    ...over,
  };
}

describe("ListMyClassesUseCase", () => {
  it("returns the teacher's classes on success", async () => {
    const repo = makeRepo();
    const res = await new ListMyClassesUseCase(repo).execute();
    expect(repo.listMyClasses).toHaveBeenCalledOnce();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(CLASSES);
  });

  it("propagates a network-error failure", async () => {
    const repo = makeRepo({
      listMyClasses: vi
        .fn()
        .mockResolvedValue({ ok: false, error: { type: "network-error" } }),
    });
    const res = await new ListMyClassesUseCase(repo).execute();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("network-error");
  });

  it("propagates an unauthorized failure", async () => {
    const repo = makeRepo({
      listMyClasses: vi
        .fn()
        .mockResolvedValue({ ok: false, error: { type: "unauthorized" } }),
    });
    const res = await new ListMyClassesUseCase(repo).execute();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("unauthorized");
  });
});
