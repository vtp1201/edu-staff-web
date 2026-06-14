import { describe, expect, it, vi } from "vitest";
import {
  fail,
  ok,
} from "@/features/admin/class-management/domain/use-cases/result";
import type { PrincipalTeacher } from "../entities/principal-teacher.entity";
import type { IPrincipalTeachersRepository } from "../repositories/i-principal-teachers.repository";
import { GetPrincipalTeachersUseCase } from "./get-principal-teachers.use-case";

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

const teacher: PrincipalTeacher = {
  teacherId: "t-001",
  displayName: "Nguyễn Thị Lan",
  email: "lan@edu.vn",
  primarySubjectName: "Toán",
  homeroomClassId: "c-10a1",
  homeroomClassName: "10A1",
  subjectAssignments: [],
  status: "ACTIVE",
};

describe("GetPrincipalTeachersUseCase", () => {
  it("returns the teacher list on success", async () => {
    const repo = makeRepo({
      listTeachers: vi.fn().mockResolvedValue(ok([teacher])),
    });
    const result = await new GetPrincipalTeachersUseCase(repo).execute();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([teacher]);
  });

  it("returns ok with empty list", async () => {
    const repo = makeRepo({
      listTeachers: vi.fn().mockResolvedValue(ok([])),
    });
    const result = await new GetPrincipalTeachersUseCase(repo).execute();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
  });

  it("propagates a repository failure", async () => {
    const repo = makeRepo({
      listTeachers: vi.fn().mockResolvedValue(fail({ type: "network-error" })),
    });
    const result = await new GetPrincipalTeachersUseCase(repo).execute();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("network-error");
  });
});
