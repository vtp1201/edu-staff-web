import { describe, expect, it, vi } from "vitest";
import {
  fail,
  ok,
} from "@/features/admin/class-management/domain/use-cases/result";
import type { IPrincipalTeachersRepository } from "../repositories/i-principal-teachers.repository";
import { AssignHomeroomTeacherUseCase } from "./assign-homeroom-teacher.use-case";

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

describe("AssignHomeroomTeacherUseCase", () => {
  it("assigns when classId + teacherId provided", async () => {
    const assign = vi.fn().mockResolvedValue(ok(undefined));
    const repo = makeRepo({ assignHomeroomTeacher: assign });
    const result = await new AssignHomeroomTeacherUseCase(repo).execute(
      "c-10a1",
      "t-001",
    );
    expect(result.ok).toBe(true);
    expect(assign).toHaveBeenCalledWith("c-10a1", "t-001");
  });

  it("fails with unknown when classId is empty", async () => {
    const assign = vi.fn();
    const repo = makeRepo({ assignHomeroomTeacher: assign });
    const result = await new AssignHomeroomTeacherUseCase(repo).execute(
      "",
      "t-001",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("unknown");
    expect(assign).not.toHaveBeenCalled();
  });

  it("fails with unknown when teacherId is empty", async () => {
    const assign = vi.fn();
    const repo = makeRepo({ assignHomeroomTeacher: assign });
    const result = await new AssignHomeroomTeacherUseCase(repo).execute(
      "c-10a1",
      "",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("unknown");
    expect(assign).not.toHaveBeenCalled();
  });

  it("propagates a repository conflict failure", async () => {
    const repo = makeRepo({
      assignHomeroomTeacher: vi
        .fn()
        .mockResolvedValue(fail({ type: "conflict-exists" })),
    });
    const result = await new AssignHomeroomTeacherUseCase(repo).execute(
      "c-10a1",
      "t-001",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("conflict-exists");
  });
});
