import { describe, expect, it, vi } from "vitest";
import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import {
  fail,
  ok,
} from "@/features/admin/class-management/domain/use-cases/result";
import type { IPrincipalTeachersRepository } from "../repositories/i-principal-teachers.repository";
import { GetPrincipalClassesUseCase } from "./get-principal-classes.use-case";

function makeRepo(
  overrides: Partial<IPrincipalTeachersRepository> = {},
): IPrincipalTeachersRepository {
  return {
    listTeachers: vi.fn(),
    listClasses: vi.fn(),
    getClassSubjects: vi.fn(),
    assignHomeroomTeacher: vi.fn(),
    assignSubjectTeacher: vi.fn(),
    ...overrides,
  };
}

const cls: Class = {
  id: "c-10a1",
  name: "10A1",
  gradeLevel: 10,
  status: "ACTIVE",
  academicYear: "2025-2026",
  studentCount: 32,
  homeroomTeacherId: null,
  homeroomTeacherName: null,
};

describe("GetPrincipalClassesUseCase", () => {
  it("returns the class list on success", async () => {
    const repo = makeRepo({
      listClasses: vi.fn().mockResolvedValue(ok([cls])),
    });
    const result = await new GetPrincipalClassesUseCase(repo).execute();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([cls]);
  });

  it("returns ok with empty list", async () => {
    const repo = makeRepo({
      listClasses: vi.fn().mockResolvedValue(ok([])),
    });
    const result = await new GetPrincipalClassesUseCase(repo).execute();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
  });

  it("propagates a repository failure", async () => {
    const repo = makeRepo({
      listClasses: vi.fn().mockResolvedValue(fail({ type: "network-error" })),
    });
    const result = await new GetPrincipalClassesUseCase(repo).execute();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("network-error");
  });
});
