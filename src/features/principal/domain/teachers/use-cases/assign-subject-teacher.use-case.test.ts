import { describe, expect, it, vi } from "vitest";
import {
  fail,
  ok,
} from "@/features/admin/class-management/domain/use-cases/result";
import type { IPrincipalTeachersRepository } from "../repositories/i-principal-teachers.repository";
import { AssignSubjectTeacherUseCase } from "./assign-subject-teacher.use-case";

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

describe("AssignSubjectTeacherUseCase", () => {
  it("assigns when all ids provided", async () => {
    const assign = vi.fn().mockResolvedValue(ok(undefined));
    const repo = makeRepo({ assignSubjectTeacher: assign });
    const result = await new AssignSubjectTeacherUseCase(repo).execute(
      "c-10a1",
      "s-toan",
      "t-001",
    );
    expect(result.ok).toBe(true);
    expect(assign).toHaveBeenCalledWith("c-10a1", "s-toan", "t-001");
  });

  it("fails with unknown when classId is empty", async () => {
    const assign = vi.fn();
    const repo = makeRepo({ assignSubjectTeacher: assign });
    const result = await new AssignSubjectTeacherUseCase(repo).execute(
      "",
      "s-toan",
      "t-001",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("unknown");
    expect(assign).not.toHaveBeenCalled();
  });

  it("fails with unknown when subjectId is empty", async () => {
    const assign = vi.fn();
    const repo = makeRepo({ assignSubjectTeacher: assign });
    const result = await new AssignSubjectTeacherUseCase(repo).execute(
      "c-10a1",
      "",
      "t-001",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("unknown");
    expect(assign).not.toHaveBeenCalled();
  });

  it("fails with unknown when teacherId is empty", async () => {
    const assign = vi.fn();
    const repo = makeRepo({ assignSubjectTeacher: assign });
    const result = await new AssignSubjectTeacherUseCase(repo).execute(
      "c-10a1",
      "s-toan",
      "",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("unknown");
    expect(assign).not.toHaveBeenCalled();
  });

  it("propagates a repository conflict failure", async () => {
    const repo = makeRepo({
      assignSubjectTeacher: vi
        .fn()
        .mockResolvedValue(fail({ type: "conflict-exists" })),
    });
    const result = await new AssignSubjectTeacherUseCase(repo).execute(
      "c-10a1",
      "s-toan",
      "t-001",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("conflict-exists");
  });
});
