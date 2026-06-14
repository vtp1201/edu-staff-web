import { describe, expect, it, vi } from "vitest";
import {
  fail,
  ok,
} from "@/features/admin/class-management/domain/use-cases/result";
import type { PrincipalClassSubject } from "../entities/class-subject.entity";
import type { IPrincipalTeachersRepository } from "../repositories/i-principal-teachers.repository";
import { GetClassSubjectsUseCase } from "./get-class-subjects.use-case";

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

const subject: PrincipalClassSubject = {
  id: "cs-001",
  classId: "c-11b1",
  subjectId: "s-van",
  subjectName: "Ngữ văn",
  teacherId: null,
  teacherName: null,
};

describe("GetClassSubjectsUseCase", () => {
  it("returns the class-subjects for the given classId", async () => {
    const getClassSubjects = vi.fn().mockResolvedValue(ok([subject]));
    const repo = makeRepo({ getClassSubjects });
    const result = await new GetClassSubjectsUseCase(repo, "c-11b1").execute();
    expect(getClassSubjects).toHaveBeenCalledWith("c-11b1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([subject]);
  });

  it("returns ok with empty list", async () => {
    const repo = makeRepo({
      getClassSubjects: vi.fn().mockResolvedValue(ok([])),
    });
    const result = await new GetClassSubjectsUseCase(repo, "c-10a2").execute();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
  });

  it("propagates a repository failure", async () => {
    const repo = makeRepo({
      getClassSubjects: vi
        .fn()
        .mockResolvedValue(fail({ type: "network-error" })),
    });
    const result = await new GetClassSubjectsUseCase(repo, "c-11b1").execute();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("network-error");
  });
});
