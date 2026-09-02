import { describe, expect, it, vi } from "vitest";
import type { TeacherClass } from "../entities/teacher-class.entity";
import type { ITeacherClassRepository } from "../repositories/i-teacher-class.repository";
import { GetMyClassUseCase } from "./get-my-class.use-case";

function cls(id: string): TeacherClass {
  return {
    id,
    name: id.toUpperCase(),
    gradeLevel: 10,
    studentCount: 36,
    isHomeroom: false,
    roles: ["subject"],
    subjects: [{ id: "sub-math", name: "Toán" }],
    academicYearLabel: "2025–2026",
  };
}

function makeRepo(
  listMyClasses: ITeacherClassRepository["listMyClasses"],
): ITeacherClassRepository {
  return {
    listMyClasses,
    getClassStudents: vi.fn(),
    getHomeroomKpi: vi.fn(),
  } as unknown as ITeacherClassRepository;
}

describe("GetMyClassUseCase", () => {
  it("returns the class when it belongs to the teacher's own list", async () => {
    const repo = makeRepo(async () => ({
      ok: true,
      data: [cls("cls-10a1"), cls("cls-11b2")],
    }));
    const result = await new GetMyClassUseCase(repo).execute("cls-11b2");
    expect(result).toEqual({ ok: true, data: cls("cls-11b2") });
  });

  it("a class id that is not in MY list is `not-found` — the page must not distinguish 'does not exist' from 'not yours' (existence oracle)", async () => {
    const repo = makeRepo(async () => ({ ok: true, data: [cls("cls-10a1")] }));
    const result = await new GetMyClassUseCase(repo).execute(
      "cls-someone-else",
    );
    expect(result).toEqual({ ok: false, error: { type: "not-found" } });
  });

  it("an empty class list is `not-found`, never a crash", async () => {
    const repo = makeRepo(async () => ({ ok: true, data: [] }));
    const result = await new GetMyClassUseCase(repo).execute("cls-10a1");
    expect(result).toEqual({ ok: false, error: { type: "not-found" } });
  });

  it("passes a repository failure straight through (network-error stays network-error, NOT not-found)", async () => {
    const repo = makeRepo(async () => ({
      ok: false,
      error: { type: "network-error" },
    }));
    const result = await new GetMyClassUseCase(repo).execute("cls-10a1");
    expect(result).toEqual({ ok: false, error: { type: "network-error" } });
  });
});
