import { describe, expect, it, vi } from "vitest";
import type { IClassManagementRepository } from "../repositories/i-class-management.repository";
import { AssignHomeroomTeacherUseCase } from "./assign-homeroom-teacher.use-case";
import { fail, ok } from "./result";

describe("AssignHomeroomTeacherUseCase", () => {
  it("assigns a homeroom teacher via the repository", async () => {
    const repo = {
      assignHomeroomTeacher: vi.fn().mockResolvedValue(ok(undefined)),
    } as unknown as IClassManagementRepository;
    const useCase = new AssignHomeroomTeacherUseCase(repo);
    const result = await useCase.execute("c-1", "u-teacher");
    expect(result.ok).toBe(true);
    expect(repo.assignHomeroomTeacher).toHaveBeenCalledWith("c-1", "u-teacher");
  });

  it("propagates not-found failure", async () => {
    const repo = {
      assignHomeroomTeacher: vi
        .fn()
        .mockResolvedValue(fail({ type: "not-found" })),
    } as unknown as IClassManagementRepository;
    const useCase = new AssignHomeroomTeacherUseCase(repo);
    const result = await useCase.execute("missing", "u-teacher");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("not-found");
  });
});
